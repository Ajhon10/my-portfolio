import { AppContract, DatabaseContract, GearContract } from '@app/contract'
import { GearRequest } from '@app/controller/request'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'

@Injectable()
export class GearProvider implements GearContract {
  constructor(@Inject(AppContract.DATABASE) private readonly database: DatabaseContract) {}

  findAll(admin = false) {
    return this.database.gear.findMany({
      where: { deleted: false, ...(admin ? {} : { published: true }) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: admin ? 200 : 100,
    })
  }

  async save(data: GearRequest, id?: string) {
    if (!id) return this.database.gear.create({ data })

    const gear = await this.database.gear.findFirst({ where: { id, deleted: false } })
    if (!gear) throw new NotFoundException('Gear not found')
    return this.database.gear.update({ where: { id }, data })
  }

  async delete(id: string) {
    const gear = await this.database.gear.findFirst({ where: { id, deleted: false } })
    if (!gear) throw new NotFoundException('Gear not found')
    await this.database.gear.update({
      where: { id },
      data: { deleted: true, deletedAt: new Date() },
    })
  }
}
