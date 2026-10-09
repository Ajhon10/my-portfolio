import { PhotographyProvider } from './photography.provider'
import { PhotographRequest } from '../controller/request/photography.request'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'

describe('Photography visibility and validation', () => {
  const database = { photograph: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() } }
  const provider = new PhotographyProvider(database as any)
  beforeEach(() => jest.clearAllMocks())
  it('only exposes published non-deleted photos publicly', async () => {
    await provider.findAll()
    expect(database.photograph.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deleted: false, published: true } }),
    )
  })
  it('includes drafts only in the admin list', async () => {
    await provider.findAll(true)
    expect(database.photograph.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { deleted: false } }))
  })
  it('soft deletes and rejects missing records', async () => {
    database.photograph.findFirst.mockResolvedValueOnce({ id: 'test' })
    await provider.delete('test')
    expect(database.photograph.update).toHaveBeenCalledWith({
      where: { id: 'test' },
      data: { deleted: true, deletedAt: expect.any(Date) },
    })
    database.photograph.findFirst.mockResolvedValueOnce(null)
    await expect(provider.delete('missing')).rejects.toThrow('Photograph not found')
  })
  it('validates accessible text, safe media paths and order', async () => {
    const valid = { title: 'Street', altText: 'Sunlight on a quiet street', imageUrl: '/uploads/photo.webp' }
    expect(await validate(plainToInstance(PhotographRequest, valid))).toHaveLength(0)
    const invalid = await validate(
      plainToInstance(PhotographRequest, { ...valid, altText: '', imageUrl: 'javascript:alert(1)', sortOrder: -1 }),
    )
    expect(invalid.map((e) => e.property)).toEqual(expect.arrayContaining(['altText', 'imageUrl', 'sortOrder']))
  })
})
