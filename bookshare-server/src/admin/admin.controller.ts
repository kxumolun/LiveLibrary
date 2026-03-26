import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt'))
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard(
    @Request() req: { user: { email: string } },
    @Query('includeMap') includeMap?: string,
    @Query('includeRecent') includeRecent?: string,
    @Query('includeStats') includeStats?: string,
  ) {
    return this.adminService.getDashboard(req.user.email, {
      includeMap: includeMap === '1' || includeMap === 'true',
      includeRecent: includeRecent === '1' || includeRecent === 'true',
      includeStats: includeStats === '1' || includeStats === 'true',
    });
  }

  @Get('users')
  listUsers(
    @Request() req: { user: { email: string } },
    @Query('q') q?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.listUsers(req.user.email, {
      q,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Patch('users/:id/block')
  blockUser(
    @Request() req: { user: { email: string } },
    @Param('id') id: string,
  ) {
    return this.adminService.blockUser(req.user.email, id);
  }

  @Patch('users/:id/unblock')
  unblockUser(
    @Request() req: { user: { email: string } },
    @Param('id') id: string,
  ) {
    return this.adminService.unblockUser(req.user.email, id);
  }

  @Delete('users/:id')
  deleteUser(
    @Request() req: { user: { id: string; email: string } },
    @Param('id') id: string,
  ) {
    return this.adminService.deleteUser(req.user.email, req.user.id, id);
  }

  @Get('books')
  listBooks(
    @Request() req: { user: { email: string } },
    @Query('q') q?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.adminService.listBooks(req.user.email, {
      q,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  @Patch('books/:id/hide')
  hideBook(
    @Request() req: { user: { email: string } },
    @Param('id') id: string,
  ) {
    return this.adminService.hideBook(req.user.email, id);
  }

  @Patch('books/:id/unhide')
  unhideBook(
    @Request() req: { user: { email: string } },
    @Param('id') id: string,
  ) {
    return this.adminService.unhideBook(req.user.email, id);
  }

  @Delete('books/:id')
  deleteBook(
    @Request() req: { user: { email: string } },
    @Param('id') id: string,
  ) {
    return this.adminService.deleteBook(req.user.email, id);
  }
}
