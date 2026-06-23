// src/adapters/api/graphql/blog/dto/update-comment.input.ts

import { Field, InputType } from '@nestjs/graphql';

@InputType('UpdateCommentInput')
export class UpdateCommentInput {
  @Field({ nullable: true, description: '评论内容' })
  content?: string;

  @Field({ nullable: true, description: '评论状态' })
  status?: string;

  @Field({ nullable: true, description: '驳回原因' })
  rejectReason?: string;
}