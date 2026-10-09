import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { AppContract, DatabaseContract } from '@app/contract'
import { PhotographRequest } from '../controller/request/photography.request'
import { PhotographyContract } from '../contract/photography.contract'
@Injectable()
export class PhotographyProvider implements PhotographyContract {
  constructor(@Inject(AppContract.DATABASE) private readonly database: DatabaseContract) {}
  findAll(admin = false) {
    return this.database.photograph.findMany({
      where: { deleted: false, ...(admin ? {} : { published: true }) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    })
  }
  async save(data: PhotographRequest, id?: string) {
    if (!id) return this.database.photograph.create({ data })
    if (!(await this.database.photograph.findFirst({ where: { id, deleted: false } })))
      throw new NotFoundException('Photograph not found')
    return this.database.photograph.update({ where: { id }, data })
  }
  async delete(id: string) {
    if (!(await this.database.photograph.findFirst({ where: { id, deleted: false } })))
      throw new NotFoundException('Photograph not found')
    await this.database.photograph.update({ where: { id }, data: { deleted: true, deletedAt: new Date() } })
  }
}
