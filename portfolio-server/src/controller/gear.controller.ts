import { Roles } from '@app/common/decorator'
import { AccessTokenGuard, RoleGuard } from '@app/common/guard'
import { GearProvider } from '@app/provider'
import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, UseGuards } from '@nestjs/common'
import { GearRequest } from './request/gear.request'

@Controller('/gears')
export class GearController {
  constructor(private readonly provider: GearProvider) {}

  @Get()
  async list() {
    return { success: true, data: await this.provider.findAll() }
  }

  @Get('/admin')
  @UseGuards(AccessTokenGuard, RoleGuard)
  @Roles('OWNER', 'ADMIN')
  async adminList() {
    return { success: true, data: await this.provider.findAll(true) }
  }

  @Post()
  @UseGuards(AccessTokenGuard, RoleGuard)
  @Roles('OWNER', 'ADMIN')
  async create(@Body() body: GearRequest) {
    return { success: true, message: 'Gear saved', data: await this.provider.save(body) }
  }

  @Put('/:id')
  @UseGuards(AccessTokenGuard, RoleGuard)
  @Roles('OWNER', 'ADMIN')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() body: GearRequest) {
    return { success: true, message: 'Gear saved', data: await this.provider.save(body, id) }
  }

  @Delete('/:id')
  @UseGuards(AccessTokenGuard, RoleGuard)
  @Roles('OWNER', 'ADMIN')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.provider.delete(id)
    return { success: true, message: 'Gear deleted' }
  }
}
