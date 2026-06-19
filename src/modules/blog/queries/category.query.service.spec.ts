// src/modules/blog/queries/category.query.service.spec.ts

import { DomainError } from '@core/common/errors/domain-error';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BLOG_ERROR } from '../blog.errors';
import { CategoryEntity } from '../base/entities/category.entity';
import { PostEntity } from '../base/entities/post.entity';
import { CategoryQueryService } from './category.query.service';

describe('CategoryQueryService', () => {
  let service: CategoryQueryService;
  let categoryRepository: Repository<CategoryEntity>;
  let postRepository: Repository<PostEntity>;

  const mockCategoryRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPostRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryQueryService,
        {
          provide: getRepositoryToken(CategoryEntity),
          useValue: mockCategoryRepository,
        },
        {
          provide: getRepositoryToken(PostEntity),
          useValue: mockPostRepository,
        },
      ],
    }).compile();

    service = module.get<CategoryQueryService>(CategoryQueryService);
    categoryRepository = module.get<Repository<CategoryEntity>>(getRepositoryToken(CategoryEntity));
    postRepository = module.get<Repository<PostEntity>>(getRepositoryToken(PostEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllCategories', () => {
    it('应该返回所有分类列表', async () => {
      const mockCategories = [
        {
          id: '1',
          name: '技术',
          slug: 'tech',
          description: '技术文章',
          parentId: null,
          parent: null,
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: '前端',
          slug: 'frontend',
          description: '前端开发',
          parentId: '1',
          parent: { name: '技术' },
          sortOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([
          { categoryId: '1', count: '5' },
          { categoryId: '2', count: '3' },
        ]),
      };

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockPostRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getAllCategories();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('技术');
      expect(result[0].postCount).toBe(5);
      expect(result[1].parentName).toBe('技术');
      expect(result[1].postCount).toBe(3);
    });
  });

  describe('getCategoryById', () => {
    it('应该返回单个分类', async () => {
      const mockCategory = {
        id: '1',
        name: '技术',
        slug: 'tech',
        description: '技术文章',
        parentId: null,
        parent: null,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ categoryId: '1', count: '10' }]),
      };

      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
      mockPostRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCategoryById('1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
      expect(result?.name).toBe('技术');
      expect(result?.postCount).toBe(10);
    });

    it('应该返回 null 当分类不存在', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      const result = await service.getCategoryById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('getCategoryOrThrow', () => {
    it('应该返回分类', async () => {
      const mockCategory = {
        id: '1',
        name: '技术',
        slug: 'tech',
        description: null,
        parentId: null,
        parent: null,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
      mockPostRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCategoryOrThrow('1');

      expect(result.id).toBe('1');
    });

    it('应该抛出错误当分类不存在', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.getCategoryOrThrow('invalid-id')).rejects.toThrow(DomainError);
      await expect(service.getCategoryOrThrow('invalid-id')).rejects.toHaveProperty(
        'code',
        BLOG_ERROR.CATEGORY_NOT_FOUND,
      );
    });
  });

  describe('getCategoryTree', () => {
    it('应该返回分类树结构', async () => {
      const mockCategories = [
        {
          id: '1',
          name: '技术',
          slug: 'tech',
          description: null,
          parentId: null,
          sortOrder: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: '前端',
          slug: 'frontend',
          description: null,
          parentId: '1',
          sortOrder: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '3',
          name: '后端',
          slug: 'backend',
          description: null,
          parentId: '1',
          sortOrder: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockCategoryRepository.find.mockResolvedValue(mockCategories);
      mockPostRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCategoryTree();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('技术');
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children[0].name).toBe('前端');
      expect(result[0].children[1].name).toBe('后端');
    });

    it('应该返回空树当没有分类', async () => {
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      };

      mockCategoryRepository.find.mockResolvedValue([]);
      mockPostRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getCategoryTree();

      expect(result).toHaveLength(0);
    });
  });
});