import { connectMcp } from './mcp-client.mjs';

const call = await connectMcp();
const result = await call('tools/call', {
  name: 'execute_code',
  arguments: {
    code: `
      const text = penpotUtils.findShape(shape => shape.id === '85cceaf8-a74d-80d7-8008-abfe0b39884c');
      const button = penpotUtils.findShape(shape => shape.id === '85cceaf8-a74d-80d7-8008-abfe0a371877');
      text.characters = '確認画面へ進む';
      text.resize(225, 28); text.x = 477; text.y = 480;
      button.resize(260, 52); button.x = 442; button.y = 468;
      return { text: text.characters, textWidth: text.width, buttonWidth: button.width };
    `,
  },
});

const output = JSON.stringify(result);
console.log(output);
if (output.includes('failed') || !output.includes('確認画面へ進む') || !output.includes('260')) {
  throw new Error('MCP did not apply the before state.');
}
