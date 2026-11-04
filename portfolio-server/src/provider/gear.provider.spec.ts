import 'reflect-metadata'
import type { DatabaseContract } from '@app/contract'
import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { GearRequest } from '../controller/request/gear.request'
import { GearProvider } from './gear.provider'

describe('GearProvider', () => {
  const database = {
    gear: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  }
	const provider = new GearProvider(database as unknown as DatabaseContract)

  beforeEach(() => jest.clearAllMocks())

  it('returns a bounded published list to public visitors', async () => {
    database.gear.findMany.mockResolvedValue([])

    await provider.findAll()

    expect(database.gear.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deleted: false, published: true }, take: 100 }),
    )
  })

  it('lets admins list drafts without deleted records', async () => {
    database.gear.findMany.mockResolvedValue([])

    await provider.findAll(true)

    expect(database.gear.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deleted: false }, take: 200 }),
    )
  })

  it('soft deletes an existing gear item', async () => {
    database.gear.findFirst.mockResolvedValue({ id: 'gear-id' })

    await provider.delete('gear-id')

    expect(database.gear.update).toHaveBeenCalledWith({
      where: { id: 'gear-id' },
      data: { deleted: true, deletedAt: expect.any(Date) },
    })
  })

  it('validates text, safe URLs and non-negative display order', async () => {
    const valid = plainToInstance(GearRequest, {
      name: 'Development laptop',
      category: 'Computer',
      description: 'The laptop used for application development.',
      altText: 'A development laptop on a desk',
      imageUrl: '/uploads/laptop.webp',
      productUrl: 'https://example.com/laptop',
    })
    expect(await validate(valid)).toHaveLength(0)

    const invalid = plainToInstance(GearRequest, {
      ...valid,
      altText: '',
      imageUrl: 'javascript:alert(1)',
      productUrl: 'javascript:alert(1)',
      sortOrder: -1,
    })
    const properties = (await validate(invalid)).map((error) => error.property)
    expect(properties).toEqual(expect.arrayContaining(['altText', 'imageUrl', 'productUrl', 'sortOrder']))
  })
})
