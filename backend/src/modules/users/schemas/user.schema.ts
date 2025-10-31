import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User &
  Document & {
    _id: Types.ObjectId;
  };

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  username: string; // acts as nickname for kids

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  ageRange: string; // "8-10", "11-13", etc.

  @Prop({ default: '🐱' })
  avatar: string; // profile picture or emoji

  @Prop({ default: 'student' })
  role: string; // "student", "admin"

  @Prop()
  guardianEmail?: string; // optional parent/guardian email
}

export const UserSchema = SchemaFactory.createForClass(User);
