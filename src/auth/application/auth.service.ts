import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/application/users.service';
import { LoginDto } from '../dto/login.dto';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/users/domain/user.entity';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

interface JwtPayload {
  sub: string;
  email: string;
}

interface GoogleProfile {
  emails: { value: string }[];
  displayName: string;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private configService: ConfigService,
    @InjectQueue('notifications') private readonly notificationsQueue: Queue,
  ) {}

  async register(dto: CreateUserDto) {
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    const user = await this.usersService.create(dto);
    await this.notificationsQueue.add('welcome-email', {
      email: user.email,
      username: user.username,
    });
    const tokens = await this.generateTokens(user);
    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateTokens(user);
  }

  async validateGoogleUser(profile: any) {
    const googleProfile = profile as GoogleProfile;
    const { emails, displayName } = googleProfile;
    const email = emails[0].value;

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-8);
      user = await this.usersService.create({
        email,

        username: displayName,
        password: randomPassword,
      });
    }
    return user;
  }

  async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      }),
    ]);
    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        refreshToken,
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        },
      );

      const user = await this.usersService.findOne(payload.sub);
      if (!user) throw new ForbiddenException('Access Denied');

      const tokens = await this.generateTokens(user);

      return tokens;
    } catch (error: any) {
      throw new ForbiddenException('Invalid Refresh Secret');
    }
  }
}
