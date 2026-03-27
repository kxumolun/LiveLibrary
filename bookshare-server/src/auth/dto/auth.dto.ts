import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @Transform(({ value }) => String(value ?? '').trim().replace(/\s+/g, ' '))
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  @Matches(/^[A-Za-zÀ-ÖØ-öø-ÿА-Яа-яЁёʻ’'`\-\s]+$/, {
    message: "Ism faqat harflar va bo'shliqdan iborat bo'lishi kerak",
  })
  fullName: string;

  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsEmail()
  @MaxLength(120)
  email: string;

  @Transform(({ value }) => String(value ?? ''))
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
    message: "Parolda kamida 1 ta harf va 1 ta raqam bo'lishi kerak",
  })
  password: string;

  @Transform(({ value }) => String(value ?? '').replace(/[^\d+]/g, '').trim())
  @IsString()
  @Matches(/^\+998\d{9}$/, {
    message: "Telefon formati: +998901234567",
  })
  phone: string;

  @IsOptional()
  @Transform(({ value }) => {
    const v = String(value ?? '').trim();
    return v || undefined;
  })
  @IsString()
  @MaxLength(80)
  city?: string;
}

export class LoginDto {
  @Transform(({ value }) => String(value ?? '').trim().toLowerCase())
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
