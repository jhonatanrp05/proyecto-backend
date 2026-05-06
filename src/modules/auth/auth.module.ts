import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../shared/prisma';
import { AuthService } from './application/auth.service';
import { AuthController } from './presentation/auth.controller';
import { AuthRepository } from './infrastructure/auth.repository';
import { JwtStrategy } from './infrastructure/jwt.strategy';
import { AUTH_REPOSITORY } from './domain/auth.repository.interface';
import { StringValue } from 'ms'; // <- importar el tipo

@Module({
  imports: [
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '7d') as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    { provide: AUTH_REPOSITORY, useClass: AuthRepository },
  ],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
