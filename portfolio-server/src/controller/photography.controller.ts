import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common'
import { AccessTokenGuard, RoleGuard } from '@app/common/guard'
import { Roles } from '@app/common/decorator'
import { PhotographyProvider } from '../provider/photography.provider'
import { PhotographRequest } from './request/photography.request'
@Controller('photography')
export class PhotographyController {
  constructor(private readonly provider: PhotographyProvider) {}
  @Get() async list() {
    return { success: true, data: await this.provider.findAll() }
  }
  @Get('admin')
  @UseGuards(AccessTokenGuard, RoleGuard)
  @Roles('OWNER', 'ADMIN')
  async admin() {
    return { success: true, data: await this.provider.findAll(true) }
  }
  @Post()
  @UseGuards(AccessTokenGuard, RoleGuard)
  @Roles('OWNER', 'ADMIN')
  async create(@Body() body: PhotographRequest) {
    return { success: true, message: 'Photograph saved', data: await this.provider.save(body) }
  }
  @Put(':id')
  @UseGuards(AccessTokenGuard, RoleGuard)
  @Roles('OWNER', 'ADMIN')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: PhotographRequest) {
    return { success: true, message: 'Photograph saved', data: await this.provider.save(body, id) }
  }
  @Delete(':id')
  @UseGuards(AccessTokenGuard, RoleGuard)
  @Roles('OWNER', 'ADMIN')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.provider.delete(id)
    return { success: true, message: 'Photograph deleted' }
  }
}
