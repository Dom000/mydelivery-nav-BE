import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Request() req: { user: { id: string } }) {
    return this.userService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('packages')
  getMyPackages(@Request() req: { user: { id: string } }) {
    return this.userService.getPackages(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('deliveries')
  getMyDeliveries(@Request() req: { user: { id: string } }) {
    return this.userService.getDeliveries(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('shipping-addresses')
  getMyShippingAddresses(@Request() req: { user: { id: string } }) {
    return this.userService.getShippingAddresses(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMyProfile(
    @Request() req: { user: { id: string } },
    @Body() body: { name?: string },
  ) {
    return this.userService.updateProfile(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('shipping-addresses')
  saveMyShippingAddress(
    @Request() req: { user: { id: string } },
    @Body()
    body: {
      id?: string;
      label: string;
      address: string;
      default: boolean;
      city: string;
      state: string;
      zip: string;
      country: string;
      phone1: string;
      phone2?: string | null;
    },
  ) {
    return this.userService.saveShippingAddress(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('shipping-addresses/:id')
  updateMyShippingAddress(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
    @Body()
    body: {
      label: string;
      address: string;
      default: boolean;
      city: string;
      state: string;
      zip: string;
      country: string;
      phone1: string;
      phone2?: string | null;
    },
  ) {
    return this.userService.saveShippingAddress(req.user.id, { ...body, id });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.remove(id);
  }
}
