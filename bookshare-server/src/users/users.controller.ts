import { Controller, Get, Post, Query, Param, UseGuards, Request, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('map')
  getUsersForMap(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius: string,
    @Query('userId') userId?: string,
  ) {
    return this.usersService.getUsersForMap(
      parseFloat(lat),
      parseFloat(lng),
      parseFloat(radius) || 500,
      userId,
    );
  }

  @Post('avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(@Request() req, @UploadedFile() file: Express.Multer.File) {
    return this.usersService.uploadAvatar(req.user.id, file);
  }

  @Get(':id')
  getUserProfile(@Param('id') id: string) {
    return this.usersService.getUserProfile(id);
  }
}