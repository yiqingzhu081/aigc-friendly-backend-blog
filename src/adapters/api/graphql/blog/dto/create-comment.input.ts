// src/adapters/api/graphql/blog/dto/create-comment.input.ts

import { Field, InputType } from '@nestjs/graphql';

@InputType('CreateCommentInput')
export class CreateCommentInput {
  @Field(() => String, { description: '文章ID' })
  postId!: string;

  @Field(() => String, { nullable: true, description: '父评论ID（回复评论时使用）' })
  parentId?: string | null;

  @Field({ description: '评论者昵称' })
  authorName!: string;

  @Field({ description: '评论者邮箱' })
  authorEmail!: string;

  @Field({ description: '评论内容' })
  content!: string;
}