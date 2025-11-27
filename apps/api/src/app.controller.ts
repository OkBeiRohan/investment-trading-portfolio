import { Controller, Get, Res } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Response } from 'express';
import { AppService } from './app.service';
import { version } from '../package.json';

@AllowAnonymous()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getHome(@Res() res: Response) {
    const html = this.appService.getHome();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  @Get('/home.css')
  getHomeCss(@Res() res: Response) {
    const css = this.appService.getHomeCss();
    res.setHeader('Content-Type', 'text/css');
    res.send(css);
  }

  @Get('/home.js')
  getHomeJs(@Res() res: Response) {
    const js = this.appService.getHomeJs();
    res.setHeader('Content-Type', 'application/javascript');
    res.send(js);
  }

  @Get('/api/version')
  getVersion(@Res() res: Response) {
    res.json({ version: version || 'unknown' });
  }

  @Get('/api/frontend-url')
  getFrontendUrl(@Res() res: Response) {
    const url = process.env.FRONTEND_URL || 'unknown';
    res.json({ url });
  }
}
