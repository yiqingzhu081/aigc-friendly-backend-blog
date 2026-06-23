// src/adapters/api/graphql/blog/dto/comment-tree-node.dto.ts

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { CommentDto } from './comment.dto';

@ObjectType('CommentTreeNode')
export class CommentTreeNodeDto extends CommentDto {
  @Field(() => [CommentTreeNodeDto], { nullable: true, description: '子评论列表' })
  children!: CommentTreeNodeDto[];
}