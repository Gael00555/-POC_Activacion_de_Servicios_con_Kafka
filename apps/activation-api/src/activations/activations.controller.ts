import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ActivationsService } from './activations.service';
import { CreateActivationDto } from './create-activation.dto';

@Controller('activations')
export class ActivationsController {
  constructor(private readonly activationsService: ActivationsService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  create(@Body() dto: CreateActivationDto) {
    return this.activationsService.create(dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activationsService.findOne(id);
  }
}