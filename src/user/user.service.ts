import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { MailService } from '../mail/mail.service';
import { Contact } from './entities/contact.entity';
import * as jwt from 'jsonwebtoken';
import { ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { CreateContactDto } from './dto/create-contact.dto';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(Contact)
        private readonly contactRepository: Repository<Contact>,
        private readonly mailService: MailService,
    ) {}
    
    async registerUser(userDetails: CreateUserDto) {
      try {
        const hashedPassword = await bcrypt.hash(userDetails.password, 10);
        const user = await this.userRepository.save({
          ...userDetails,
          password: hashedPassword,
          isVerified: false,
        });
  
        const verificationToken = jwt.sign({ email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h' });
        await this.mailService.sendVerificationEmail(user.email, verificationToken);
        return user;
      } catch (error) {
        if (error.code === '23505') {
          throw new ConflictException('User with this email already exists');
        }
        throw error;
      }
    }

    async findByEmail(email: string): Promise<User | undefined> {
        return this.userRepository.findOne({ where: { email } });
    }

    async createContact(userId: number, contactDetails: CreateContactDto) {
      const userEntity = await this.userRepository.findOne({ where: { id: userId } });
      if (!userEntity) {
        throw new NotFoundException('User not found');
      }
      
      const contact = this.contactRepository.create({ ...contactDetails, user: userEntity });
      const savedContact = await this.contactRepository.save(contact);
      
      const { user, ...contactData } = savedContact;
      return {
        ...contactData,
        userId: user.id
      };
    }

    async getContacts(userId: number, page: number, limit: number) {
        const [contacts, total] = await this.contactRepository.findAndCount({
            where: { user: { id: userId } },
            take: limit,
            skip: (page - 1) * limit,
        });

        return {
            data: contacts,
            total,
            page,
            limit,
        };
    }

    async searchContacts(userId: number, searchQuery: string) {
        return this.contactRepository.find({
            where: [
                { user: { id: userId }, name: searchQuery },
                { user: { id: userId }, phoneNumber: searchQuery },
            ],
        });
    }

    async verifyUser(email: string): Promise<void> {
      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        throw new NotFoundException('User not found');
      }
  
      if (user.isVerified) {
        throw new BadRequestException('User is already verified');
      }
  
      user.isVerified = true;
      await this.userRepository.save(user);
    }
}