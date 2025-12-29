import { Controller, Post, Body, HttpCode, HttpStatus, Res, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../common/decorators/public.decorator';
import { IsString } from 'class-validator';
import { RegisterCandidateDto } from '../employee-profile/dto/register-candidate.dto';

class LoginDto {
  @IsString()
  employeeNumber: string;

  @IsString()
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterCandidateDto, @Res() res: Response) {
    const result = await this.authService.registerCandidate(registerDto);
    
    // Set HTTP-only, secure cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', result.access_token, {
      httpOnly: true,
      secure: isProduction, // Only secure in production (HTTPS)
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Return response without token in body
    return res.json({
      message: 'Candidate registered successfully',
      user: result.user,
    });
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    const user = await this.authService.validateUser(
      loginDto.employeeNumber,
      loginDto.password,
    );
    const result = await this.authService.login(user);

    // Set HTTP-only, secure cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('auth_token', result.access_token, {
      httpOnly: true,
      secure: isProduction, // Only secure in production (HTTPS)
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    // Return response without token in body
    return res.json({
      message: 'Login successful',
      user: result.user,
    });
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Res() res: Response) {
    // Clear the auth cookie
    res.clearCookie('auth_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return res.json({
      message: 'Logout successful',
    });
  }
}
