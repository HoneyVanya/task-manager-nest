import { ClientsModule, Transport, ClientGrpc } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom, Observable } from 'rxjs';
import { Test, TestingModule } from '@nestjs/testing';

interface Task {
  id: string;
  title: string;
  completed: boolean;
  authorId: string;
}

interface TaskList {
  tasks: Task[];
}

interface ITaskService {
  findAll(data: {
    userId: string;
    page: number;
    limit: number;
  }): Observable<TaskList>;
}

async function run() {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      ClientsModule.register([
        {
          name: 'TASKS_PACKAGE',
          transport: Transport.GRPC,
          options: {
            package: 'tasks',
            protoPath: join(__dirname, '../proto/tasks.proto'),
            url: 'localhost:50051',
          },
        },
      ]),
    ],
  }).compile();

  const client = module.get<ClientGrpc>('TASKS_PACKAGE');
  const tasksService = client.getService<ITaskService>('TasksService');

  const REAL_USER_ID = 'b082d655-9f1b-4438-bebe-342aac218098';

  console.log(
    `\n🔌 Connecting to gRPC Service... target user: ${REAL_USER_ID}`,
  );

  try {
    const response = await firstValueFrom(
      tasksService.findAll({
        userId: REAL_USER_ID,
        page: 1,
        limit: 5,
      }),
    );

    console.log('✅ gRPC Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('❌ gRPC Error:', error);
  }

  await module.close();
}

run().catch((err) => {
  console.error('Error during gRPC-client run:', err);
  process.exit(1);
});
