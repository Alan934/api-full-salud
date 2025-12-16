import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import MercadoPagoConfig, { OAuth, Payment, Preference } from 'mercadopago';
import { Practitioner } from '../../domain/entities';
import { Repository } from 'typeorm';

@Injectable()
export class MercadoPagoService {

    private oauth: OAuth;

    constructor(
        @InjectRepository(Practitioner) protected practitionerRepository: Repository<Practitioner>,
    ) {
        const client = new MercadoPagoConfig({
            accessToken: '',
            options: { timeout: 5000 },
        })
        this.oauth = new OAuth(client);
    }


    // URL para iniciar OAuth
    getAuthUrl(): string {
        return `https://auth.mercadopago.com.ar/authorization?client_id=${process.env.MP_CLIENT_ID}&response_type=code&platform_id=mp&state=RANDOM_ID&redirect_uri=${encodeURIComponent(process.env.MP_REDIRECT_URI)}`;
    }

    // Maneja el callback para que el usuario autorice al sistema 
    async HandleCallback(code: string): Promise<{ user_id: string; scope: string }> {
        try {


            const response = await this.oauth.create({
                body: {
                    client_secret: process.env.MP_CLIENT_SECRET,
                    client_id: process.env.MP_CLIENT_ID,
                    code,
                    redirect_uri: process.env.MP_REDIRECT_URI,
                },
            });
            const userId = response.user_id.toString();

            let account = await this.practitionerRepository.findOne({ where: { mpUserId: userId } });

            if (!account) {
                account = this.practitionerRepository.create({
                    mpUserId: userId,
                    mpAccessToken: response.access_token,
                    mpRefreshToken: response.refresh_token,
                    mpScope: response.scope,
                });
            } else {
                account.mpAccessToken = response.access_token;
                account.mpRefreshToken = response.refresh_token;
                account.mpScope = response.scope;
            }

            await this.practitionerRepository.save(account);

            return { user_id: userId, scope: response.scope };
        } catch (error) {
            throw new InternalServerErrorException(
                'Error procesando el callback de Mercado Pago',
                error,
            );
        }
    }

    //Para traer los datos de un usuario
    async getTokenInfo(userId: string) {
        try {
            const account = await this.practitionerRepository.findOne({ where: { mpUserId: userId } });
            if (!account) return null;

            return {
                user_id: account.mpUserId,
                scope: account.mpScope,
                hasToken: !!account.mpAccessToken,
            };
        } catch (error) {
            throw new InternalServerErrorException(
                'Error obteniendo token info',
                error,
            );
        }
    }

    //Crear split de pagos
    async createSplitPayment(body: {
        userId: string;
        amount: number;
        description?: string;
        receiverUserId: string;
        percentage: number;
    }) {
        try {
            const { userId, amount, description, receiverUserId, percentage } = body;

            const account = await this.practitionerRepository.findOne({ where: { mpUserId: userId } });
            if (!account) throw new NotFoundException('User not authenticated');

            const client = new MercadoPagoConfig({
                accessToken: account.mpAccessToken,
                options: { timeout: 5000 },
            });

            const preference = new Preference(client);

            const totalAmount = parseFloat(amount.toString());
            const receiverAmount = totalAmount * (percentage / 100);
            const feeAmount = totalAmount - receiverAmount;

            const preferenceData = {
                items: [
                    {
                        id: 'item-1',
                        title: description || 'Test payment',
                        quantity: 1,
                        unit_price: totalAmount,
                        currency_id: 'ARS',
                    },
                ],
                external_reference: `test-${Date.now()}`,
                back_urls: {
                    success: `${process.env.PUBLIC_URL}/success`,
                    failure: `${process.env.PUBLIC_URL}/failure`,
                    pending: `${process.env.PUBLIC_URL}/pending`,
                },
                notification_url: `${process.env.PUBLIC_URL}/mercado-pago/payments/webhook`,
                auto_return: 'approved',
                marketplace_fee: feeAmount,
                marketplace: 'FullSalud',
                metadata: {
                    receiver_user_id: receiverUserId,
                    receiver_amount: receiverAmount,
                    fee_amount: feeAmount,
                    split_percentage: percentage,
                    fullsalud_integration: true,
                },
            };

            const result = await preference.create({ body: preferenceData });

            return {
                preference_id: result.id,
                init_point: result.init_point,
                checkout_url: result.init_point,
                transaction_amount: totalAmount,
                split_info: {
                    receiver_amount: receiverAmount,
                    fee_amount: feeAmount,
                    receiver_percentage: percentage,
                },
            };
        } catch (error) {
            throw new InternalServerErrorException(
                'Error creando pago con split',
                error,
            );
        }
    }

    //Obtener el estado de un pago
    async getPaymentStatus(paymentId: string, userId: string) {
        try {

            const account = await this.practitionerRepository.findOne({ where: { mpUserId: userId } });
            if (!account) throw new NotFoundException('User not authenticated');

            const client = new MercadoPagoConfig({
                accessToken: account.mpAccessToken,
                options: { timeout: 5000 },
            });

            const payment = new Payment(client);
            const result = await payment.get({ id: paymentId });

            return {
                id: result.id,
                status: result.status,
                status_detail: result.status_detail,
                transaction_amount: result.transaction_amount,
                date_created: result.date_created,
                metadata: result.metadata,
            };

        } catch (error) {
            throw new InternalServerErrorException(
                'Error obteniendo estado del pago',
                error,
            );
        }
    }

    //Para que un medico desconcete su cuenta de MP de nuestro sistema
    async disconnectAccount(userId: string) {
        try {
            const account = await this.practitionerRepository.findOne({ where: { mpUserId: userId } });

            if (!account) throw new NotFoundException('Cuenta no encontrada');

            account.mpUserId = null;
            account.mpAccessToken = null;
            account.mpRefreshToken = null;
            account.mpScope = null;

            await this.practitionerRepository.save(account);

            return { success: true, message: 'Cuenta de Mercado Pago desvinculada' };

        } catch (error) {
            throw new InternalServerErrorException(
                'Error desvinculando cuenta',
                error,
            );
        }
    }


}
