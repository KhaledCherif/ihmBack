import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      service: 'home-service-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
