import { ValidateInput } from '@adapters/api/graphql/common/validate-input.decorator';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CreatePostUsecase } from '@src/usecases/blog/create-post.usecase';
import { DeletePostUsecase } from '@src/usecases/blog/delete-post.usecase';
import { GetPostUsecase } from '@src/usecases/blog/get-post.usecase';
import { ListPostsUsecase } from '@src/usecases/blog/list-posts.usecase';
import { UpdatePostUsecase } from '@src/usecases/blog/update-post.usecase';
import { TogglePostTopUsecase } from '@src/usecases/blog/toggle-post-top.usecase';
import { PublishPostUsecase } from '@src/usecases/blog/publish-post.usecase';
import { UnpublishPostUsecase } from '@src/usecases/blog/unpublish-post.usecase';
import { RestorePostUsecase } from '@src/usecases/blog/restore-post.usecase';
import { IncrementPostViewUsecase } from '@src/usecases/blog/increment-post-view.usecase';
import { ListDeletedPostsUsecase } from '@src/usecases/blog/list-deleted-posts.usecase';
import { CreateCategoryUsecase } from '@src/usecases/blog/create-category.usecase';
import { UpdateCategoryUsecase } from '@src/usecases/blog/update-category.usecase';
import { DeleteCategoryUsecase } from '@src/usecases/blog/delete-category.usecase';
import { GetCategoryUsecase } from '@src/usecases/blog/get-category.usecase';
import { ListCategoriesUsecase } from '@src/usecases/blog/list-categories.usecase';
import { GetCategoryTreeUsecase } from '@src/usecases/blog/get-category-tree.usecase';
import { CreateTagUsecase } from '@src/usecases/blog/create-tag.usecase';
import { UpdateTagUsecase } from '@src/usecases/blog/update-tag.usecase';
import { DeleteTagUsecase } from '@src/usecases/blog/delete-tag.usecase';
import { GetTagUsecase } from '@src/usecases/blog/get-tag.usecase';
import { ListTagsUsecase } from '@src/usecases/blog/list-tags.usecase';
import { GetPopularTagsUsecase } from '@src/usecases/blog/get-popular-tags.usecase';
import { AddTagsToPostUsecase } from '@src/usecases/blog/add-tags-to-post.usecase';
import { RemoveTagsFromPostUsecase } from '@src/usecases/blog/remove-tags-from-post.usecase';
import type {
  CategoryView,
  CategoryTreeNode,
  PostView,
  TagView,
  TagWithCount,
} from '@src/modules/blog/blog.types';
import { CreatePostInput } from './dto/create-post.input';
import { PostConnection } from './dto/post-connection.dto';
import { PostDto } from './dto/post.dto';
import { PostQueryInput } from './dto/post-query.input';
import { UpdatePostInput } from './dto/update-post.input';
import { CategoryDto } from './dto/category.dto';
import { CategoryTreeNodeDto } from './dto/category-tree-node.dto';
import { CreateCategoryInput } from './dto/create-category.input';
import { UpdateCategoryInput } from './dto/update-category.input';
import { TagDto } from './dto/tag.dto';
import { TagWithCountDto } from './dto/tag-with-count.dto';
import { CreateTagInput } from './dto/create-tag.input';
import { UpdateTagInput } from './dto/update-tag.input';

@Resolver()
export class BlogResolver {
  constructor(
    private readonly createPostUsecase: CreatePostUsecase,
    private readonly updatePostUsecase: UpdatePostUsecase,
    private readonly deletePostUsecase: DeletePostUsecase,
    private readonly getPostUsecase: GetPostUsecase,
    private readonly listPostsUsecase: ListPostsUsecase,
    private readonly togglePostTopUsecase: TogglePostTopUsecase,
    private readonly publishPostUsecase: PublishPostUsecase,
    private readonly unpublishPostUsecase: UnpublishPostUsecase,
    private readonly restorePostUsecase: RestorePostUsecase,
    private readonly incrementPostViewUsecase: IncrementPostViewUsecase,
    private readonly listDeletedPostsUsecase: ListDeletedPostsUsecase,
    private readonly createCategoryUsecase: CreateCategoryUsecase,
    private readonly updateCategoryUsecase: UpdateCategoryUsecase,
    private readonly deleteCategoryUsecase: DeleteCategoryUsecase,
    private readonly getCategoryUsecase: GetCategoryUsecase,
    private readonly listCategoriesUsecase: ListCategoriesUsecase,
    private readonly getCategoryTreeUsecase: GetCategoryTreeUsecase,
    private readonly createTagUsecase: CreateTagUsecase,
    private readonly updateTagUsecase: UpdateTagUsecase,
    private readonly deleteTagUsecase: DeleteTagUsecase,
    private readonly getTagUsecase: GetTagUsecase,
    private readonly listTagsUsecase: ListTagsUsecase,
    private readonly getPopularTagsUsecase: GetPopularTagsUsecase,
    private readonly addTagsToPostUsecase: AddTagsToPostUsecase,
    private readonly removeTagsFromPostUsecase: RemoveTagsFromPostUsecase,
  ) {}

  @Query(() => PostConnection, { description: '文章列表查询（支持分页）' })
  @ValidateInput()
  async posts(@Args('input', { nullable: true }) input?: PostQueryInput): Promise<PostConnection> {
    const result = await this.listPostsUsecase.execute(input || {});
    return {
      items: result.items.map((item) => ({
        id: item.id,
        title: item.title,
        slug: item.slug,
        excerpt: item.excerpt,
        content: item.content,
        contentHtml: item.contentHtml,
        status: item.status,
        isTop: item.isTop,
        viewCount: item.viewCount,
        likeCount: item.likeCount,
        commentCount: item.commentCount,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        tagIds: item.tagIds,
        tagNames: item.tagNames,
        publishedAt: item.publishedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  @Query(() => PostDto, { nullable: true, description: '查询单篇文章' })
  @ValidateInput()
  async post(@Args('id') id: string): Promise<PostDto | null> {
    const result = await this.getPostUsecase.execute(id);
    if (!result) {
      return null;
    }
    return {
      id: result.id,
      title: result.title,
      slug: result.slug,
      excerpt: result.excerpt,
      content: result.content,
      contentHtml: result.contentHtml,
      status: result.status,
      isTop: result.isTop,
      viewCount: result.viewCount,
      likeCount: result.likeCount,
      commentCount: result.commentCount,
      categoryId: result.categoryId,
      categoryName: result.categoryName,
      tagIds: result.tagIds,
      tagNames: result.tagNames,
      publishedAt: result.publishedAt,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  @Mutation(() => PostDto, { description: '创建文章' })
  @ValidateInput()
  async createPost(@Args('input') input: CreatePostInput): Promise<PostDto> {
    const result = await this.createPostUsecase.execute({
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      content: input.content,
      categoryId: input.categoryId || null,
      tagIds: input.tagIds || [],
      isTop: input.isTop || false,
    });
    return {
      id: result.id,
      title: result.title,
      slug: result.slug,
      excerpt: result.excerpt,
      content: result.content,
      contentHtml: result.contentHtml,
      status: result.status,
      isTop: result.isTop,
      viewCount: result.viewCount,
      likeCount: result.likeCount,
      commentCount: result.commentCount,
      categoryId: result.categoryId,
      categoryName: result.categoryName,
      tagIds: result.tagIds,
      tagNames: result.tagNames,
      publishedAt: result.publishedAt,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  @Mutation(() => PostDto, { description: '更新文章' })
  @ValidateInput()
  async updatePost(
    @Args('id') id: string,
    @Args('input') input: UpdatePostInput,
  ): Promise<PostDto> {
    const result = await this.updatePostUsecase.execute({
      id,
      input: {
        title: input.title,
        slug: input.slug,
        excerpt: input.excerpt,
        content: input.content,
        categoryId: input.categoryId ?? undefined,
        tagIds: input.tagIds ?? undefined,
        isTop: input.isTop,
        status: input.status,
      },
    });
    return {
      id: result.id,
      title: result.title,
      slug: result.slug,
      excerpt: result.excerpt,
      content: result.content,
      contentHtml: result.contentHtml,
      status: result.status,
      isTop: result.isTop,
      viewCount: result.viewCount,
      likeCount: result.likeCount,
      commentCount: result.commentCount,
      categoryId: result.categoryId,
      categoryName: result.categoryName,
      tagIds: result.tagIds,
      tagNames: result.tagNames,
      publishedAt: result.publishedAt,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  @Mutation(() => Boolean, { description: '删除文章（软删除）' })
  @ValidateInput()
  async deletePost(@Args('id') id: string): Promise<boolean> {
    return this.deletePostUsecase.execute(id);
  }

  @Mutation(() => PostDto, { description: '切换文章置顶状态' })
  @ValidateInput()
  async togglePostTop(@Args('id') id: string): Promise<PostDto> {
    const result = await this.togglePostTopUsecase.execute(id);
    return this.toPostDto(result);
  }

  @Mutation(() => PostDto, { description: '发布文章' })
  @ValidateInput()
  async publishPost(@Args('id') id: string): Promise<PostDto> {
    const result = await this.publishPostUsecase.execute(id);
    return this.toPostDto(result);
  }

  @Mutation(() => PostDto, { description: '下架文章' })
  @ValidateInput()
  async unpublishPost(@Args('id') id: string): Promise<PostDto> {
    const result = await this.unpublishPostUsecase.execute(id);
    return this.toPostDto(result);
  }

  @Mutation(() => PostDto, { description: '恢复已删除的文章' })
  @ValidateInput()
  async restorePost(@Args('id') id: string): Promise<PostDto> {
    const result = await this.restorePostUsecase.execute(id);
    return this.toPostDto(result);
  }

  @Mutation(() => Number, { description: '增加文章阅读量' })
  @ValidateInput()
  async incrementPostView(@Args('id') id: string): Promise<number> {
    return this.incrementPostViewUsecase.execute(id);
  }

  @Query(() => PostConnection, { description: '回收站：查询已删除的文章' })
  @ValidateInput()
  async deletedPosts(
    @Args('input', { nullable: true }) input?: PostQueryInput,
  ): Promise<PostConnection> {
    const result = await this.listDeletedPostsUsecase.execute(input || {});
    return {
      items: result.items.map((item) => this.toPostDto(item)),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    };
  }

  private toPostDto(item: PostView): PostDto {
    return {
      id: item.id,
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt,
      content: item.content,
      contentHtml: item.contentHtml,
      status: item.status,
      isTop: item.isTop,
      viewCount: item.viewCount,
      likeCount: item.likeCount,
      commentCount: item.commentCount,
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      tagIds: item.tagIds,
      tagNames: item.tagNames,
      publishedAt: item.publishedAt,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  @Query(() => [CategoryDto], { description: '分类列表（扁平结构）' })
  @ValidateInput()
  async categories(): Promise<CategoryDto[]> {
    const result = await this.listCategoriesUsecase.execute();
    return result.map((item) => this.toCategoryDto(item));
  }

  @Query(() => CategoryDto, { nullable: true, description: '查询单个分类' })
  @ValidateInput()
  async category(@Args('id') id: string): Promise<CategoryDto | null> {
    const result = await this.getCategoryUsecase.execute(id);
    return result ? this.toCategoryDto(result) : null;
  }

  @Query(() => [CategoryTreeNodeDto], { description: '分类树（树形结构）' })
  @ValidateInput()
  async categoryTree(): Promise<CategoryTreeNodeDto[]> {
    const result = await this.getCategoryTreeUsecase.execute();
    return result.map((item) => this.toCategoryTreeNodeDto(item));
  }

  @Mutation(() => CategoryDto, { description: '创建分类' })
  @ValidateInput()
  async createCategory(@Args('input') input: CreateCategoryInput): Promise<CategoryDto> {
    const result = await this.createCategoryUsecase.execute({
      name: input.name,
      slug: input.slug,
      description: input.description,
      parentId: input.parentId || null,
      sortOrder: input.sortOrder || 0,
    });
    return this.toCategoryDto(result);
  }

  @Mutation(() => CategoryDto, { description: '更新分类' })
  @ValidateInput()
  async updateCategory(
    @Args('id') id: string,
    @Args('input') input: UpdateCategoryInput,
  ): Promise<CategoryDto> {
    const result = await this.updateCategoryUsecase.execute(id, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      parentId: input.parentId ?? undefined,
      sortOrder: input.sortOrder,
    });
    return this.toCategoryDto(result);
  }

  @Mutation(() => Boolean, { description: '删除分类' })
  @ValidateInput()
  async deleteCategory(@Args('id') id: string): Promise<boolean> {
    return this.deleteCategoryUsecase.execute(id);
  }

  private toCategoryDto(item: CategoryView): CategoryDto {
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      parentId: item.parentId,
      parentName: item.parentName,
      sortOrder: item.sortOrder,
      postCount: item.postCount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private toCategoryTreeNodeDto(item: CategoryTreeNode): CategoryTreeNodeDto {
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      description: item.description,
      sortOrder: item.sortOrder,
      postCount: item.postCount,
      children: item.children.map((child) => this.toCategoryTreeNodeDto(child)),
    };
  }

  @Query(() => [TagDto], { description: '标签列表' })
  @ValidateInput()
  async tags(): Promise<TagDto[]> {
    const result = await this.listTagsUsecase.execute();
    return result.map((item) => this.toTagDto(item));
  }

  @Query(() => TagDto, { nullable: true, description: '查询单个标签' })
  @ValidateInput()
  async tag(@Args('id') id: string): Promise<TagDto | null> {
    const result = await this.getTagUsecase.execute(id);
    return result ? this.toTagDto(result) : null;
  }

  @Query(() => [TagWithCountDto], { description: '热门标签（按文章数量排序）' })
  @ValidateInput()
  async popularTags(@Args('limit', { nullable: true }) limit?: number): Promise<TagWithCountDto[]> {
    const result = await this.getPopularTagsUsecase.execute(limit || 10);
    return result.map((item) => this.toTagWithCountDto(item));
  }

  @Mutation(() => TagDto, { description: '创建标签' })
  @ValidateInput()
  async createTag(@Args('input') input: CreateTagInput): Promise<TagDto> {
    const result = await this.createTagUsecase.execute({
      name: input.name,
      slug: input.slug,
    });
    return this.toTagDto(result);
  }

  @Mutation(() => TagDto, { description: '更新标签' })
  @ValidateInput()
  async updateTag(@Args('id') id: string, @Args('input') input: UpdateTagInput): Promise<TagDto> {
    const result = await this.updateTagUsecase.execute(id, {
      name: input.name,
      slug: input.slug,
    });
    return this.toTagDto(result);
  }

  @Mutation(() => Boolean, { description: '删除标签' })
  @ValidateInput()
  async deleteTag(@Args('id') id: string): Promise<boolean> {
    return this.deleteTagUsecase.execute(id);
  }

  @Mutation(() => PostDto, { description: '为文章添加标签' })
  @ValidateInput()
  async addTagsToPost(
    @Args('postId') postId: string,
    @Args({ name: 'tagIds', type: () => [String] }) tagIds: string[],
  ): Promise<PostDto> {
    const result = await this.addTagsToPostUsecase.execute(postId, tagIds);
    return this.toPostDto(result);
  }

  @Mutation(() => PostDto, { description: '从文章移除标签' })
  @ValidateInput()
  async removeTagsFromPost(
    @Args('postId') postId: string,
    @Args({ name: 'tagIds', type: () => [String] }) tagIds: string[],
  ): Promise<PostDto> {
    const result = await this.removeTagsFromPostUsecase.execute(postId, tagIds);
    return this.toPostDto(result);
  }

  private toTagDto(item: TagView): TagDto {
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      postCount: item.postCount,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private toTagWithCountDto(item: TagWithCount): TagWithCountDto {
    return {
      id: item.id,
      name: item.name,
      slug: item.slug,
      count: item.count,
    };
  }
}
