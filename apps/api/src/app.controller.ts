import { Controller, Get, Header } from '@nestjs/common';
import { AllowAnonymous } from '@repo/authentication';
import { AppService } from './app.service';
import { version } from '../package.json';

@AllowAnonymous()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Header('Content-Type', 'text/html')
  async getHome() {
    const html = this.appService.getHome();
    return html;
  }

  @Get('/home.css')
  @Header('Content-Type', 'text/css')
  getHomeCss() {
    const css = this.appService.getHomeCss();
    return css;
  }

  @Get('/home.js')
  @Header('Content-Type', 'application/javascript')
  getHomeJs() {
    const js = this.appService.getHomeJs();
    return js;
  }

  @Get('/api/version')
  getVersion() {
    return { version: version || 'unknown' };
  }

  @Get('/api/frontend-url')
  getFrontendUrl() {
    const url = process.env.FRONTEND_URL || 'unknown';
    return { url };
  }
}
