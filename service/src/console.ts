import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OpenAITrainedModel } from './queries/models/openai';

async function bootstrap() {
  const application = await NestFactory.createApplicationContext(AppModule);

  const command = process.argv[2];

  switch (command) {
    case 'train':
      const model = application.get(OpenAITrainedModel);
      await model.prepareTrainingSets();
      break;
    default:
      console.log('Command not found');
      process.exit(1);
  }

  await application.close();
  process.exit(0);
}

bootstrap();
