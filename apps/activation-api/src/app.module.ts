import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ActivationsModule } from './activations/activations.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI ??
        'mongodb://localhost:27017/activation_api?directConnection=true',
    ),
    ActivationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}