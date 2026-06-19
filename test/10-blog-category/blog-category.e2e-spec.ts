// test/10-blog-category/blog-category.e2e-spec.ts

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApiModule } from '@src/bootstraps/api/api.module';
import { CategoryEntity } from '@src/modules/blog/base/entities/category.entity';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { initGraphQLSchema } from '../../src/adapters/api/graphql/schema/schema.init';

describe('Blog Category (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ApiModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    await initGraphQLSchema(app);

    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    // 清理测试数据
    const categoryRepo = dataSource.getRepository(CategoryEntity);
    await categoryRepo.delete({});

    await app.close();
  });

  describe('分类 CRUD', () => {
    let categoryId: string;

    it('应该成功创建分类', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "技术文章"
                description: "技术相关文章"
                sortOrder: 1
              }) {
                id
                name
                slug
                description
                sortOrder
                postCount
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.createCategory.name).toBe('技术文章');
      expect(response.body.data.createCategory.slug).toBe('技术文章');
      expect(response.body.data.createCategory.postCount).toBe(0);

      categoryId = response.body.data.createCategory.id;
    });

    it('应该拒绝重复的 slug', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "另一个技术文章"
                slug: "技术文章"
              }) {
                id
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('BLOG_ERROR_SLUG_EXISTS');
    });

    it('应该成功查询分类列表', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              categories {
                id
                name
                slug
                postCount
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.categories).toHaveLength(1);
      expect(response.body.data.categories[0].name).toBe('技术文章');
    });

    it('应该成功查询单个分类', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              category(id: "${categoryId}") {
                id
                name
                description
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.category.name).toBe('技术文章');
      expect(response.body.data.category.description).toBe('技术相关文章');
    });

    it('应该返回 null 当分类不存在', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              category(id: "invalid-id") {
                id
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.category).toBeNull();
    });

    it('应该成功更新分类', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              updateCategory(id: "${categoryId}", input: {
                name: "技术博客"
                description: "技术博客文章"
              }) {
                id
                name
                description
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.updateCategory.name).toBe('技术博客');
      expect(response.body.data.updateCategory.description).toBe('技术博客文章');
    });

    it('应该成功删除分类', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              deleteCategory(id: "${categoryId}")
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.deleteCategory).toBe(true);
    });

    it('应该拒绝删除不存在分类', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              deleteCategory(id: "invalid-id")
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('BLOG_ERROR_CATEGORY_NOT_FOUND');
    });
  });

  describe('分类树结构', () => {
    let parentId: string;
    let childId: string;

    beforeAll(async () => {
      // 创建父分类
      const parentResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "父分类"
                sortOrder: 1
              }) {
                id
              }
            }
          `,
        });

      parentId = parentResponse.body.data.createCategory.id;

      // 创建子分类
      const childResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              createCategory(input: {
                name: "子分类"
                parentId: "${parentId}"
                sortOrder: 2
              }) {
                id
              }
            }
          `,
        });

      childId = childResponse.body.data.createCategory.id;
    });

    it('应该返回分类树结构', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            query {
              categoryTree {
                id
                name
                children {
                  id
                  name
                }
              }
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.data.categoryTree).toHaveLength(1);
      expect(response.body.data.categoryTree[0].name).toBe('父分类');
      expect(response.body.data.categoryTree[0].children).toHaveLength(1);
      expect(response.body.data.categoryTree[0].children[0].name).toBe('子分类');
    });

    it('应该拒绝删除有子分类的分类', async () => {
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              deleteCategory(id: "${parentId}")
            }
          `,
        });

      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('BLOG_ERROR_CATEGORY_HAS_CHILDREN');
    });

    it('应该先删除子分类再删除父分类', async () => {
      // 删除子分类
      const deleteChildResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              deleteCategory(id: "${childId}")
            }
          `,
        });

      expect(deleteChildResponse.status).toBe(200);
      expect(deleteChildResponse.body.data.deleteCategory).toBe(true);

      // 删除父分类
      const deleteParentResponse = await request(app.getHttpServer())
        .post('/graphql')
        .send({
          query: `
            mutation {
              deleteCategory(id: "${parentId}")
            }
          `,
        });

      expect(deleteParentResponse.status).toBe(200);
      expect(deleteParentResponse.body.data.deleteCategory).toBe(true);
    });
  });
});