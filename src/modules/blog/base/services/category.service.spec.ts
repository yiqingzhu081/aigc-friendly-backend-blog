// src/modules/blog/base/services/category.service.spec.ts

import { DomainError } from '@core/common/errors/domain-error';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BLOG_ERROR } from '../../blog.errors';
import { CategoryEntity } from '../entities/category.entity';
import { CategoryService } from './category.service';

describe('CategoryService', () => {
  let service: CategoryService;
  let repository: Repository<CategoryEntity>;

  const mockRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    exists: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: getRepositoryToken(CategoryEntity),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    repository = module.get<Repository<CategoryEntity>>(getRepositoryToken(CategoryEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    it('应该成功创建分类', async () => {
      const input = {
        name: '技术文章',
        description: '技术相关文章',
        sortOrder: 1,
      };

      const mockEntity = {
        id: '1',
        name: '技术文章',
        slug: '技术文章',
        description: '技术相关文章',
        parentId: null,
        sortOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue(mockEntity);

      const result = await service.createCategory(input);

      expect(result.id).toBe('1');
      expect(result.name).toBe('技术文章');
      expect(result.slug).toBe('技术文章');
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { slug: '技术文章' } });
    });

    it('应该拒绝重复的 slug', async () => {
      const input = {
        name: '技术文章',
        slug: 'existing-slug',
      };

      mockRepository.findOne.mockResolvedValue({ id: '2', slug: 'existing-slug' });

      await expect(service.createCategory(input)).rejects.toThrow(DomainError);
      await expect(service.createCategory(input)).rejects.toHaveProperty(
        'code',
        BLOG_ERROR.SLUG_EXISTS,
      );
    });

    it('应该拒绝无效的父分类', async () => {
      const input = {
        name: '子分类',
        parentId: 'invalid-parent-id',
      };

      // 第一次 findOne 检查 slug（返回 null 表示 slug 不存在）
      // 第二次 findOne 检查父分类（返回 null 表示父分类不存在）
      mockRepository.findOne
        .mockResolvedValueOnce(null) // slug check
        .mockResolvedValueOnce(null); // parent check

      try {
        await service.createCategory(input);
        fail('应该抛出错误');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe(BLOG_ERROR.CATEGORY_NOT_FOUND);
      }
    });

    it('应该成功创建带父分类的子分类', async () => {
      const input = {
        name: '子分类',
        parentId: 'parent-id',
      };

      const parentEntity = { id: 'parent-id', name: '父分类' };
      const mockEntity = {
        id: 'child-id',
        name: '子分类',
        slug: '子分类',
        parentId: 'parent-id',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.findOne.mockResolvedValueOnce(null); // slug check
      mockRepository.findOne.mockResolvedValueOnce(parentEntity); // parent check
      mockRepository.create.mockReturnValue(mockEntity);
      mockRepository.save.mockResolvedValue(mockEntity);

      const result = await service.createCategory(input);

      expect(result.parentId).toBe('parent-id');
    });
  });

  describe('updateCategory', () => {
    it('应该成功更新分类名称', async () => {
      const existingEntity = {
        id: '1',
        name: '旧名称',
        slug: 'old-slug',
        description: null,
        parentId: null,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedEntity = { ...existingEntity, name: '新名称' };

      mockRepository.findOne.mockResolvedValue(existingEntity);
      mockRepository.save.mockResolvedValue(updatedEntity);

      const result = await service.updateCategory('1', { name: '新名称' });

      expect(result.name).toBe('新名称');
    });

    it('应该拒绝将分类设置为自身的子分类', async () => {
      const existingEntity = {
        id: '1',
        name: '分类',
        slug: 'category',
      };

      mockRepository.findOne.mockResolvedValue(existingEntity);

      await expect(service.updateCategory('1', { parentId: '1' })).rejects.toThrow(DomainError);
    });

    it('应该拒绝重复的 slug', async () => {
      const existingEntity = {
        id: '1',
        name: '分类',
        slug: 'old-slug',
      };

      mockRepository.findOne.mockResolvedValueOnce(existingEntity);
      mockRepository.findOne.mockResolvedValueOnce({ id: '2', slug: 'new-slug' });

      await expect(service.updateCategory('1', { slug: 'new-slug' })).rejects.toThrow(DomainError);
    });
  });

  describe('deleteCategory', () => {
    it('应该成功删除分类', async () => {
      const existingEntity = {
        id: '1',
        name: '分类',
      };

      mockRepository.findOne.mockResolvedValue(existingEntity);
      mockRepository.exists.mockResolvedValue(false);
      mockRepository.delete.mockResolvedValue({ affected: 1 });

      const result = await service.deleteCategory('1');

      expect(result).toBe(true);
    });

    it('应该拒绝删除不存在分类', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteCategory('invalid-id')).rejects.toThrow(DomainError);
      await expect(service.deleteCategory('invalid-id')).rejects.toHaveProperty(
        'code',
        BLOG_ERROR.CATEGORY_NOT_FOUND,
      );
    });

    it('应该拒绝删除有子分类的分类', async () => {
      const existingEntity = {
        id: '1',
        name: '父分类',
      };

      mockRepository.findOne.mockResolvedValue(existingEntity);
      mockRepository.exists.mockResolvedValue(true);

      await expect(service.deleteCategory('1')).rejects.toThrow(DomainError);
      await expect(service.deleteCategory('1')).rejects.toHaveProperty(
        'code',
        BLOG_ERROR.CATEGORY_HAS_CHILDREN,
      );
    });
  });

  describe('generateSlug', () => {
    it('应该正确生成 slug', async () => {
      // 通过 createCategory 间接测试 generateSlug
      const input = { name: 'Hello World Test' };

      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockImplementation((data) => data);
      mockRepository.save.mockImplementation((data) => data);

      await service.createCategory(input);

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'hello-world-test' }),
      );
    });
  });
});
