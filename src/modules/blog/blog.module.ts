import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BloggerEntity } from './base/entities/blogger.entity';
import { CategoryEntity } from './base/entities/category.entity';
import { CommentEntity } from './base/entities/comment.entity';
import { FileEntity } from './base/entities/file.entity';
import { LinkEntity } from './base/entities/link.entity';
import { PostEntity } from './base/entities/post.entity';
import { TagEntity } from './base/entities/tag.entity';
import { BlogService } from './base/services/blog.service';
import { CategoryService } from './base/services/category.service';
import { TagService } from './base/services/tag.service';
import { BlogQueryService } from './queries/blog.query.service';
import { CategoryQueryService } from './queries/category.query.service';
import { TagQueryService } from './queries/tag.query.service';

@Module({})
export class BlogModule {
  static forRoot(): DynamicModule {
    return {
      module: BlogModule,
      imports: [
        TypeOrmModule.forFeature([
          PostEntity,
          CategoryEntity,
          TagEntity,
          CommentEntity,
          LinkEntity,
          BloggerEntity,
          FileEntity,
        ]),
      ],
      providers: [BlogService, CategoryService, TagService, BlogQueryService, CategoryQueryService, TagQueryService],
      exports: [TypeOrmModule, BlogService, CategoryService, TagService, BlogQueryService, CategoryQueryService, TagQueryService],
    };
  }
}