import { Gear } from '@prisma/client'
import { GearRequest } from '../controller/request/gear.request'

export interface GearContract {
  findAll(admin?: boolean): Promise<Gear[]>
  save(data: GearRequest, id?: string): Promise<Gear>
  delete(id: string): Promise<void>
}
