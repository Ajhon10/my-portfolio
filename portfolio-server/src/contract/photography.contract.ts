import { PhotographRequest } from '../controller/request/photography.request'
import { Photograph } from '@prisma/client'
export interface PhotographyContract {
  findAll(admin?: boolean): Promise<Photograph[]>
  save(data: PhotographRequest, id?: string): Promise<Photograph>
  delete(id: string): Promise<void>
}
