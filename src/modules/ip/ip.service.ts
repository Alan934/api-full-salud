import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ip } from '../../domain/entities/ip.entity';
import { CreateIpDto, UpdateIpDto } from '../../domain/dtos/ip/ip.dto';

@Injectable()
export class IpService {
  constructor(
    @InjectRepository(Ip)
    private readonly ipRepository: Repository<Ip>
  ) {}

  async create(createIpDto: CreateIpDto): Promise<Ip> {
    try {
      // Obtener la fecha actual sin la hora
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Buscar si existe una IP registrada hoy
      const existingIp = await this.ipRepository
        .createQueryBuilder('ip')
        .where('ip.ip = :ipAddress', { ipAddress: createIpDto.ip })
        .andWhere('ip.deletedAt IS NULL')
        .andWhere('DATE(ip.lastAccessDate) = DATE(:today)', { today })
        .getOne();

      if (existingIp) {
        // Si existe, incrementar el contador y actualizar la fecha
        existingIp.dailyCount += 1;
        existingIp.lastAccessDate = new Date();
        return await this.ipRepository.save(existingIp);
      }

      // Si no existe, crear nuevo registro
      const ip = this.ipRepository.create({
        ...createIpDto,
        dailyCount: 1,
        lastAccessDate: new Date()
      });
      
      return await this.ipRepository.save(ip);
    } catch (error) {
      throw new InternalServerErrorException('Error al crear la IP', (error as any).message);
    }
  }

  async getAll(): Promise<Ip[]> {
    try {
      return await this.ipRepository.find({ where: { deletedAt: null } });
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener las IPs');
    }
  }

  async getOne(id: string): Promise<Ip> {
    try {
      const ip = await this.ipRepository.findOne({ where: { id, deletedAt: null } });
      if (!ip) throw new NotFoundException(`No se encontró la IP con id ${id}`);
      return ip;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new InternalServerErrorException('Error al obtener la IP');
    }
  }

  async update(id: string, updateIpDto: UpdateIpDto): Promise<Ip> {
    try {
      const ip = await this.getOne(id);
      Object.assign(ip, updateIpDto);
      return await this.ipRepository.save(ip);
    } catch (error) {
      throw new InternalServerErrorException('Error al actualizar la IP');
    }
  }

  async deleted(id: string): Promise<{ message: string }> {
    try {
      const ip = await this.getOne(id);
      await this.ipRepository.softRemove(ip);
      return { message: `IP con id "${id}" eliminada correctamente` };
    } catch (error) {
      throw new InternalServerErrorException('Error al eliminar la IP');
    }
  }

  async getDailyStats(ipAddress: string): Promise<{ 
    dailyCount: number, 
    lastAccess: Date 
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const ipStats = await this.ipRepository
        .createQueryBuilder('ip')
        .where('ip.ip = :ipAddress', { ipAddress })
        .andWhere('ip.deletedAt IS NULL')
        .andWhere('DATE(ip.lastAccessDate) = DATE(:today)', { today })
        .getOne();

      if (!ipStats) {
        return { dailyCount: 0, lastAccess: null };
      }

      return {
        dailyCount: ipStats.dailyCount,
        lastAccess: ipStats.lastAccessDate
      };
    } catch (error) {
      throw new InternalServerErrorException('Error al obtener estadísticas de la IP');
    }
  }
}