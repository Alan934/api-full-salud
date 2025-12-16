import { PractitionerService } from './../practitioner/practitioner.service';
import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ChangePasswordDto } from '../../domain/dtos/password/chance-password';
import { BaseService } from '../../common/bases/base.service';
import { ErrorManager } from '../../common/exceptions/error.manager';
import {
  UserDto,
  UpdateUserDto,
  AuthUserDto,
  SerializerUserDto,
  ResetPasswordDto
} from '../../domain/dtos';
import 'multer';
import { Patient, Practitioner, User } from '../../domain/entities';
import { Role } from '../../domain/enums/role.enum';
import { Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { plainToInstance } from 'class-transformer';
import { JwtService } from '@nestjs/jwt';
import { envConfig } from '../../config/envs';
import { put } from '@vercel/blob';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService extends BaseService<User, UserDto, UpdateUserDto> {
  constructor(
    @InjectRepository(User) protected repository: Repository<User>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Practitioner)
    private readonly practitionerRepository: Repository<Practitioner>,
    private readonly jwtService: JwtService,
    private readonly emailService: MailService,
    private readonly practitionerService: PractitionerService
  ) {
    super(repository);
  }

  async onModuleInit() {
    await this.ensureAdminExists();
  }

  async signJWT(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  async loginUser(loginDto: AuthUserDto) {
    const { email, password } = loginDto;
    try {
      const user = await this.findUserByIdentity(email);

      if (!user) {
        throw new ErrorManager(
          'No existe ninguna cuenta registrada con este correo electrónico',
          401
        );
      }

      // Verificar si el usuario tiene contraseña
      if (!user.password) {
        throw new ErrorManager(
          'Esta cuenta requiere restablecer su contraseña. Por favor, utiliza la opción "Olvidé mi contraseña"',
          401
        );
      }

      // Validar contraseña
      try {
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
          throw new ErrorManager('La contraseña ingresada es incorrecta', 401);
        }
      } catch (bcryptError) {
        throw new ErrorManager(
          'Error al validar las credenciales. Por favor, intenta nuevamente',
          500
        );
      }

      if (!user.activated) {
        throw new ErrorManager(
          'Tu cuenta aún no está verificada. Por favor, revisa tu correo electrónico para activarla',
          403
        );
      }

      // Crear el payload del token
      const payload: JwtPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        lastName: user.lastName
      };

      const accessToken = await this.signJWT(payload);
      const userDto = plainToInstance(SerializerUserDto, user);

      const {
        id,
        name,
        lastName,
        email: newEmail,
        role,
        urlImg,
        ...rest
      } = userDto;

      return {
        id,
        name,
        lastName,
        email: newEmail,
        role,
        urlImg,
        accessToken
      };
    } catch (error) {
      if (error instanceof ErrorManager) {
        throw new HttpException(error.message, error.getStatus());
      }

      throw new HttpException(
        'Ocurrió un problema al intentar iniciar sesión. Por favor, verifica tus datos e intenta nuevamente',
        500
      );
    }
  }

  async generateRefreshToken(token: string) {
    try {
      const { sub, iat, exp, ...user } = this.jwtService.verify(token, {
        secret: envConfig.JWT_SECRET
      });

      let tokenR;

      const userDto = plainToInstance(SerializerUserDto, user);

      if (!userDto) {
        throw new ErrorManager('Invalid user data', 401);
      }

      if (userDto.role === Role.PATIENT) {
        tokenR = await this.jwtService.sign(user, {
          secret: envConfig.JWT_SECRET,
          expiresIn: '1h'
        });
      } else if (userDto.role === Role.PRACTITIONER) {
        tokenR = await this.jwtService.sign(user, {
          secret: envConfig.JWT_SECRET,
          expiresIn: '12h'
        });
      } else if (userDto.role === Role.ADMIN) {
        tokenR = await this.jwtService.sign(user, {
          secret: envConfig.JWT_SECRET,
          expiresIn: '45m'
        });
      } else if (userDto.role === Role.PRACTITIONER_SECRETARY) {
        tokenR = await this.jwtService.sign(user, {
          secret: envConfig.JWT_SECRET,
          expiresIn: '12h'
        });
      } else if (userDto.role === Role.SECRETARY) {
        tokenR = await this.jwtService.sign(user, {
          secret: envConfig.JWT_SECRET,
          expiresIn: '12h'
        });
      }

      return {
        ...userDto,
        accessToken: tokenR
      };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto
  ): Promise<{ message: string }> {
    try {
      const user = await this.getUserById(userId);

      // Validar que las contraseñas nuevas coincidan
      if (
        changePasswordDto.newPassword !== changePasswordDto.confirmNewPassword
      ) {
        throw new ErrorManager('New passwords do not match', 400);
      }

      const newHashedPassword = await bcrypt.hash(
        changePasswordDto.newPassword,
        10
      );

      // Determinar la tabla correcta según el rol del usuario
      if (user.role === Role.PRACTITIONER) {
        const practitioner = await this.practitionerRepository.findOne({
          where: { id: user.id }
        });
        if (!practitioner) {
          throw new ErrorManager('Practitioner not found', 404);
        }
        practitioner.password = newHashedPassword;
        practitioner.passwordChangedAt = new Date();
        await this.practitionerRepository.save(practitioner);
      } else if (user.role === Role.PATIENT) {
        const patient = await this.patientRepository.findOne({
          where: { id: user.id }
        });
        if (!patient) {
          throw new ErrorManager('Patient not found', 404);
        }
        patient.password = newHashedPassword;
        patient.passwordChangedAt = new Date();
        await this.patientRepository.save(patient);
      } else {
        const generalUser = await this.repository.findOne({
          where: { id: user.id }
        });
        if (!generalUser) {
          throw new ErrorManager('User not found', 404);
        }
        generalUser.password = newHashedPassword;
        generalUser.passwordChangedAt = new Date();
        await this.repository.save(generalUser);
      }

      return { message: 'Password updated successfully' };
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async ensureAdminExists() {
    const adminExists = await this.repository.findOne({
      where: { role: Role.ADMIN }
    });

    if (!adminExists) {
      console.log('No admin found. Creating default admin...');

      const defaultAdmin = this.repository.create({
        email: 'admin@example.com',
        username: 'admin',
        password: await bcrypt.hash('Admin123*', 10),
        role: Role.ADMIN,
        name: 'Default',
        lastName: 'Admin'
      });

      await this.repository.save(defaultAdmin);
      console.log('Default admin created successfully.');
    }
  }

  async getUserById(userId: string): Promise<User> {
    try {
      const user: User | undefined =
        (await this.patientRepository.findOne({
          where: [{ id: userId ?? undefined }]
        })) ||
        (await this.practitionerRepository.findOne({
          where: [{ id: userId ?? undefined }]
        })) ||
        (await this.repository.findOne({
          where: [{ id: userId ?? undefined }]
        }));

      if (!user) {
        throw new ErrorManager('Invalid User by id', 401);
      }

      return user;
    } catch (error) {
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validar el tipo de archivo
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, GIF, and WEBP are allowed'
      );
    }

    // Validar el tamaño del archivo
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxFileSize) {
      throw new BadRequestException(
        'File size exceeds the maximum allowed size of 5MB'
      );
    }

    try {
      const blob = await put(file.originalname, file.buffer, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
      });

      return blob.url;
    } catch (error) {
      throw new BadRequestException('Failed to upload image');
    }
  }

  async googleSignIn(req) {
    if (!req.user) {
      throw new HttpException('No user from Google', 400);
    }

    const {
      email,
      firstName,
      lastName,
      picture,
      birthDate,
      sex,
      phoneNumber,
      address,
      username
    } = req.user;

    const user: User | undefined =
      (await this.patientRepository.findOne({
        where: { googleBool: true, email: email }
      })) ||
      (await this.practitionerRepository.findOne({
        where: { googleBool: true, email: email }
      })) ||
      (await this.repository.findOne({
        where: { googleBool: true, email: email }
      }));

    const exist: User | undefined =
      (await this.patientRepository.findOne({
        where: { email: email }
      })) ||
      (await this.practitionerRepository.findOne({
        where: { email: email }
      })) ||
      (await this.repository.findOne({
        where: { email: email }
      }));

    if (!user && exist) {
      return new HttpException('Email already in use', 400);
    }

    if (user) {
      const payload: JwtPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        lastName: user.lastName
      };
      const accessToken = await this.signJWT(payload);

      const userDto = plainToInstance(SerializerUserDto, user);
      const {
        id,
        name,
        lastName,
        email: newEmail,
        role,
        urlImg,
        ...rest
      } = userDto;
      return { id, name, lastName, email: newEmail, role, urlImg, accessToken };
    } else {
      return {
        email: email,
        name: firstName,
        lastName: lastName,
        username: username,
        urlImg: picture
      };
    }
  }

  async forgotPassword(email: string) {
    const user: User | undefined =
      (await this.patientRepository.findOne({
        where: [{ email: email ?? undefined }]
      })) ||
      (await this.practitionerRepository.findOne({
        where: [{ email: email ?? undefined }]
      })) ||
      (await this.repository.findOne({
        where: [{ email: email ?? undefined }]
      }));

    if (!user) {
      throw new ErrorManager('User not found', 404);
    }

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      lastName: user.lastName
    };

    const token = await this.jwtService.sign(payload, {
      secret: envConfig.JWT_SECRET,
      expiresIn: '10m'
    });

    const url = `https://turnero-gules.vercel.app/login/recoverPassword?token=${token}`;

    const html = `
    <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Restablecé tu contraseña</title>
        </head>
        <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; text-align: center;">
          <h2>¡Hola ${user.name}!</h2>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p>Para continuar, hacé clic en el siguiente botón:</p>
          <a href="${url}" style="display: inline-block; margin-top: 10px; padding: 10px 20px; background: #2bbbad; color: white; text-decoration: none; border-radius: 4px;">
            Restablecer contraseña
          </a>
          <p style="margin-top: 20px;">Este enlace expirará en 15 minutos por motivos de seguridad.</p>
          <small style="color: #777;">Si no solicitaste este cambio, podés ignorar este mensaje.<br>© 2025 RST - Red de Salud Tecnológica</small>
        </body>
      </html>
      `;

    const mail = await this.emailService.sendMail(
      user.email,
      'Restablecé tu contraseña',
      html
    );

    return 'Email sent successfully';
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto, token: string) {
    const email: string = await this.decodeConfirmationToken(token);

    const user: any | undefined =
      (await this.patientRepository.findOne({
        where: [{ email: email ?? undefined }]
      })) ||
      (await this.practitionerRepository.findOne({
        where: [{ email: email ?? undefined }]
      })) ||
      (await this.repository.findOne({
        where: [{ email: email ?? undefined }]
      }));

    if (!user) {
      throw new ErrorManager('User not found', 404);
    }

    const hashedPassword = await bcrypt.hash(resetPasswordDto.password, 10);
    if (user.role === Role.PRACTITIONER) {
      user.password = hashedPassword;
      await this.practitionerRepository.save(user);
    } else if (user.role === Role.PATIENT) {
      user.password = hashedPassword;
      await this.patientRepository.save(user);
    } else {
      user.password = hashedPassword;
      await this.repository.save(user);
    }

    await this.repository.save(user);
    return { message: 'Password updated successfully' };
  }

  async decodeConfirmationToken(token: string): Promise<string> {
    try {
      const payload = (await this.jwtService.verifyAsync(token, {
        secret: envConfig.JWT_SECRET
      })) as { email?: string };

      if (
        typeof payload === 'object' &&
        'email' in payload &&
        typeof payload.email === 'string'
      ) {
        return payload.email;
      } else {
        throw new BadRequestException('Invalid token payload');
      }
    } catch (error) {
      if ((error as any)?.name === 'TokenExpiredError') {
        throw new BadRequestException('Email confirmation token expired');
      } else {
        throw new BadRequestException('Bad confirmation token');
      }
    }
  }

  async verifyEmail(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: envConfig.JWT_SECRET
      });

      const user = await this.getUserByRoleAndEmail(payload.role, payload.email);

      if (!user) {
        throw new BadRequestException('User not found');
      }
      if (user.activated) {
        return { message: 'Email already verified' };
      }

      user.activated = true;

      await this.saveUserByRole(user, payload.role);

      if (payload.role === Role.PRACTITIONER) {
        await this.practitionerService.practitionerAppointmentAfterVerification(user.id);
      }
      return { message: 'Email verified successfully' };
    } catch (error) {
      if ((error as any)?.name === 'TokenExpiredError') {
        throw new BadRequestException('Email confirmation token expired');
      } else {
        throw new BadRequestException('Error inesperado en la verificación');
      }
    }
  }

  async getUserByRoleAndEmail(role: Role, email: string) {
    switch (role) {
      case Role.PATIENT:
        return this.patientRepository.findOne({ where: { email } });
      case Role.PRACTITIONER:
        return this.practitionerRepository.findOne({ where: { email } });
      default:
        return null;
    }
  }

  async saveUserByRole(user: any, role: Role) {
    switch (role) {
      case Role.PATIENT:
        await this.patientRepository.save(user);
        break;
      case Role.PRACTITIONER:
        await this.practitionerRepository.save(user);
        break;
      default:
        return null;
    }
  }

  async sendVerificationEmail(
    savedPractitioner: Practitioner
  ): Promise<string> {
    try {
      // Armar payload del JWT
      const payload: JwtPayload = {
        id: savedPractitioner.id,
        email: savedPractitioner.email,
        role: savedPractitioner.role,
        name: savedPractitioner.name,
        lastName: savedPractitioner.lastName
      };
      // Firmar token
      const token = await this.jwtService.sign(payload, {
        secret: envConfig.JWT_SECRET,
        expiresIn: '15m'
      });

      // link de verificación
      const verificationLink = `https://turnero-gules.vercel.app/verification?token=${token}`;

      const to = savedPractitioner.email;
      const subject = 'Verificá tu cuenta';
      const html = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Verificá tu cuenta</title>
        </head>
        <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; text-align: center;">
          <h2>¡Hola ${savedPractitioner.name}!</h2>
          <p>Gracias por registrarte en nuestra plataforma.</p>
          <p>Para verificar tu cuenta, hacé clic en el siguiente enlace:</p>
          <a href="${verificationLink}" style="display: inline-block; margin-top: 10px; padding: 10px 20px; background: #2bbbad; color: white; text-decoration: none; border-radius: 4px;">Verificar mi cuenta</a>
          <p style="margin-top: 20px;">Este enlace expirará en 15 minutos.</p>
          <small style="color: #777;">Si no solicitaste este correo, ignoralo.<br>© 2025 RST - Red de Salud Tecnologica</small>
        </body>
      </html>
        `;
      // Enviar mail
      await this.emailService.sendMail(to, subject, html);

      return token;
    } catch (error) {
      if (error instanceof ErrorManager) throw error;
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  async findUserByIdentity(
    email?: string,
    dni?: string,
    token?: string
  ): Promise<Patient | Practitioner | User> {
    try {
      // Validaciones básicas
      if (!email && !dni) {
        throw new ErrorManager(
          'At least one of email or dni must be provided',
          400
        );
      }

      if (email && typeof email !== 'string') {
        throw new ErrorManager('Email must be a string', 400);
      }

      if (dni && typeof dni !== 'string') {
        throw new ErrorManager('DNI must be a string', 400);
      }

      // Extraer el rol del token si está disponible
      let roleFromToken: Role | null = null;
      if (token) {
        try {
          const decoded = this.jwtService.verify(token, {
            secret: envConfig.JWT_SECRET
          }) as JwtPayload;
          roleFromToken = decoded.role;
        } catch (error) {
          throw error;
        }
      }

      // Buscar según el rol si está disponible
      if (roleFromToken) {
        switch (roleFromToken) {
          case Role.PATIENT:
            return await this.findPatient(email, dni);
          case Role.PRACTITIONER:
            return await this.findPractitioner(email, dni);
          case Role.ADMIN:
          case Role.ORGANIZATION:
          case Role.SECRETARY:
            return await this.findUser(email, dni);
          default:
            // Si el rol no es reconocido, buscar en todas las tablas
            return await this.searchAllTables(email, dni);
        }
      } else {
        // Si no hay token o no se pudo decodificar, buscar en todas las tablas
        return await this.searchAllTables(email, dni);
      }
    } catch (error) {
      if (error instanceof ErrorManager) {
        throw error;
      }
      throw ErrorManager.createSignatureError((error as Error).message);
    }
  }

  // Métodos auxiliares privados
  private async findPatient(email?: string, dni?: string): Promise<Patient> {
    const where = [];
    if (email) where.push({ email });
    if (dni) where.push({ dni });

    const patient = await this.patientRepository.findOne({
      where: where.length > 0 ? where : undefined
    });

    if (!patient) {
      throw new ErrorManager('Patient not found', 404);
    }

    return patient;
  }

  private async findPractitioner(
    email?: string,
    dni?: string
  ): Promise<Practitioner> {
    const where = [];
    if (email) where.push({ email });
    if (dni) where.push({ dni });

    const practitioner = await this.practitionerRepository.findOne({
      where: where.length > 0 ? where : undefined
    });

    if (!practitioner) {
      throw new ErrorManager('Practitioner not found', 404);
    }

    return practitioner;
  }

  private async findUser(email?: string, dni?: string): Promise<User> {
    const where = [];
    if (email) where.push({ email });
    if (dni) where.push({ dni });

    const user = await this.repository.findOne({
      where: where.length > 0 ? where : undefined
    });

    if (!user) {
      throw new ErrorManager('User not found', 404);
    }

    return user;
  }

  private async searchAllTables(
    email?: string,
    dni?: string
  ): Promise<Patient | Practitioner | User> {
    const where = [];
    if (email) where.push({ email });
    if (dni) where.push({ dni });

    // Buscar en todas las tablas en orden de probabilidad de uso
    const patient =
      where.length > 0 ? await this.patientRepository.findOne({ where }) : null;
    if (patient) return patient;

    const practitioner =
      where.length > 0
        ? await this.practitionerRepository.findOne({ where })
        : null;
    if (practitioner) return practitioner;

    const user =
      where.length > 0 ? await this.repository.findOne({ where }) : null;
    if (user) return user;

    return null;
    // throw new ErrorManager('User not found in any table', 404);
  }

  async resetPasswordDirect(
    email: string,
    newPassword: string
  ): Promise<{ message: string }> {
    try {
      // Buscar el usuario
      const user = await this.findUserByIdentity(email);

      if (!user) {
        throw new ErrorManager(
          'No existe ninguna cuenta registrada con este correo electrónico',
          404
        );
      }

      // Validaciones detalladas de la contraseña
      if (!newPassword) {
        throw new ErrorManager('La contraseña es requerida', 400);
      }

      // Validación completa de la contraseña
      const passwordRegex =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(newPassword)) {
        throw new ErrorManager(
          'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial',
          400
        );
      }

      // Generar el hash de la nueva contraseña
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Actualizar solo la contraseña según el tipo de usuario
      if (user instanceof Patient) {
        await this.patientRepository.update(user.id, {
          password: hashedPassword
        });
      } else if (user instanceof Practitioner) {
        await this.practitionerRepository.update(user.id, {
          password: hashedPassword
        });
      } else {
        await this.repository.update(user.id, {
          password: hashedPassword
        });
      }

      // Enviar correo de confirmación
      await this.emailService.sendMail(
        user.email,
        'Contraseña actualizada',
        `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Contraseña Actualizada</title>
        </head>
          <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 20px; text-align: center;">
            <h2>¡Hola ${user.name}!</h2>
            <p>Tu contraseña ha sido actualizada exitosamente.</p>
            <p style="color: #666;">Si no realizaste este cambio, por favor contactá con soporte técnico inmediatamente.</p>
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;" />
            <small style="color: #777;">Este es un correo automático, por favor no respondas a este mensaje.<br>© 2025 RST - Red de Salud Tecnológica</small>
          </body>
        </html>
        `
      );

      return {
        message:
          'Contraseña actualizada correctamente. Se ha enviado un correo de confirmación'
      };
    } catch (error) {
      if (error instanceof ErrorManager) {
        throw error;
      }

      throw new ErrorManager(
        'Ocurrió un error al restablecer la contraseña. Por favor, intente nuevamente',
        500
      );
    }
  }
}
