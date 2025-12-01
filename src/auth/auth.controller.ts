import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
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
  async register(@Body() registerDto: RegisterCandidateDto) {
    const result = await this.authService.registerCandidate(registerDto);
    return {
      message: 'Candidate registered successfully',
      ...result,
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.employeeNumber,
      loginDto.password,
    );
    const result = await this.authService.login(user);

    return {
      message: 'Login successful',
      ...result,
    };
  }
}
