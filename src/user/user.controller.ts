import { Controller, Post, Get, Body, BadRequestException, Req, Query, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    @Inject(forwardRef(() => JwtService))
    private readonly jwtService: JwtService
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    try {
      await this.userService.registerUser(createUserDto);
      return { message: 'User registered successfully. Please check your email for verification link.' };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  @Post('contacts')
  @UseGuards(JwtAuthGuard)
  async createContact(@Body() createContactDto: CreateContactDto, @Req() req: any) {
    const userId = req.user.sub;
    return this.userService.createContact(userId, createContactDto);
  }

  @Get('contacts')
  @UseGuards(JwtAuthGuard)
  async getContacts(@Query('page') page: number = 1, @Query('limit') limit: number = 10, @Req() req: any) {
    const userId = req.user.id;
    return this.userService.getContacts(userId, page, limit);
  }

  @Get('contacts/search')
  @UseGuards(JwtAuthGuard)
  async searchContacts(@Query('query') searchQuery: string, @Req() req: any) {
    const userId = req.user.id;
    return this.userService.searchContacts(userId, searchQuery);
  }

  @Get('verify')
  async verifyEmail(@Query('token') token: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const email = decoded.email;

      await this.userService.verifyUser(email);
      return { message: 'Email verified successfully' };
    } catch (error) {
      throw new BadRequestException('Invalid or expired token');
    }
  }
}
