import { resolvePath } from '@gamerbot/util';
import { registerFont } from 'canvas';

registerFont(resolvePath('assets/fonts/RobotoMono-Regular-NF.ttf'), { family: 'Roboto Mono' });

export * as canvasStyle from './canvasStyle';
export { default as webpackConfig } from './webpack.config';
