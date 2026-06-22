import { Module } from '@nestjs/common';
import { BlogModule } from '@src/modules/blog/blog.module';
import { RedisModule } from '@src/infrastructure/redis/redis.module';
import { CreatePostUsecase } from './create-post.usecase';
import { DeletePostUsecase } from './delete-post.usecase';
import { GetPostUsecase } from './get-post.usecase';
import { ListPostsUsecase } from './list-posts.usecase';
import { UpdatePostUsecase } from './update-post.usecase';
import { TogglePostTopUsecase } from './toggle-post-top.usecase';
import { PublishPostUsecase } from './publish-post.usecase';
import { UnpublishPostUsecase } from './unpublish-post.usecase';
import { RestorePostUsecase } from './restore-post.usecase';
import { IncrementPostViewUsecase } from './increment-post-view.usecase';
import { ListDeletedPostsUsecase } from './list-deleted-posts.usecase';
import { CreateCategoryUsecase } from './create-category.usecase';
import { UpdateCategoryUsecase } from './update-category.usecase';
import { DeleteCategoryUsecase } from './delete-category.usecase';
import { GetCategoryUsecase } from './get-category.usecase';
import { ListCategoriesUsecase } from './list-categories.usecase';
import { GetCategoryTreeUsecase } from './get-category-tree.usecase';
import { CreateTagUsecase } from './create-tag.usecase';
import { UpdateTagUsecase } from './update-tag.usecase';
import { DeleteTagUsecase } from './delete-tag.usecase';
import { GetTagUsecase } from './get-tag.usecase';
import { ListTagsUsecase } from './list-tags.usecase';
import { GetPopularTagsUsecase } from './get-popular-tags.usecase';
import { AddTagsToPostUsecase } from './add-tags-to-post.usecase';
import { RemoveTagsFromPostUsecase } from './remove-tags-from-post.usecase';

@Module({
  imports: [BlogModule, RedisModule],
  providers: [
    CreatePostUsecase,
    UpdatePostUsecase,
    DeletePostUsecase,
    GetPostUsecase,
    ListPostsUsecase,
    TogglePostTopUsecase,
    PublishPostUsecase,
    UnpublishPostUsecase,
    RestorePostUsecase,
    IncrementPostViewUsecase,
    ListDeletedPostsUsecase,
    CreateCategoryUsecase,
    UpdateCategoryUsecase,
    DeleteCategoryUsecase,
    GetCategoryUsecase,
    ListCategoriesUsecase,
    GetCategoryTreeUsecase,
    CreateTagUsecase,
    UpdateTagUsecase,
    DeleteTagUsecase,
    GetTagUsecase,
    ListTagsUsecase,
    GetPopularTagsUsecase,
    AddTagsToPostUsecase,
    RemoveTagsFromPostUsecase,
  ],
  exports: [
    CreatePostUsecase,
    UpdatePostUsecase,
    DeletePostUsecase,
    GetPostUsecase,
    ListPostsUsecase,
    TogglePostTopUsecase,
    PublishPostUsecase,
    UnpublishPostUsecase,
    RestorePostUsecase,
    IncrementPostViewUsecase,
    ListDeletedPostsUsecase,
    CreateCategoryUsecase,
    UpdateCategoryUsecase,
    DeleteCategoryUsecase,
    GetCategoryUsecase,
    ListCategoriesUsecase,
    GetCategoryTreeUsecase,
    CreateTagUsecase,
    UpdateTagUsecase,
    DeleteTagUsecase,
    GetTagUsecase,
    ListTagsUsecase,
    GetPopularTagsUsecase,
    AddTagsToPostUsecase,
    RemoveTagsFromPostUsecase,
  ],
})
export class BlogUsecasesModule {}
