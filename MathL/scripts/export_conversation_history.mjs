/**
 * Exporter: Formats and exports the entire conversation transcript from start to finish
 * into a dedicated folder 'conversation_history/' in the current workspace.
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

const SOURCE_LOGS_DIR = 'C:/Users/Emmanuel/.gemini/antigravity/brain/fb050985-1c0b-4b8e-a76e-72d32eabbd09/.system_generated/logs';
const TARGET_DIR = path.resolve(process.cwd(), 'conversation_history');
const RAW_DIR = path.join(TARGET_DIR, 'raw');

if (!fs.existsSync(TARGET_DIR)) fs.mkdirSync(TARGET_DIR, { recursive: true });
if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });

console.log('--- Exporting Conversation Transcript to conversation_history/ ---\n');

// 1. Copy raw log files
const filesToCopy = ['transcript.jsonl', 'transcript_full.jsonl'];
for (const file of filesToCopy) {
  const src = path.join(SOURCE_LOGS_DIR, file);
  const dest = path.join(RAW_DIR, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    const sizeMb = (fs.statSync(dest).size / (1024 * 1024)).toFixed(2);
    console.log(`Copied raw log: ${file} (${sizeMb} MB) -> ${dest}`);
  }
}

// 2. Parse transcript_full.jsonl and generate structured Markdown transcripts
const fullLogPath = path.join(SOURCE_LOGS_DIR, 'transcript_full.jsonl');
const rl = readline.createInterface({
  input: fs.createReadStream(fullLogPath, { encoding: 'utf-8' }),
  crlfDelay: Infinity
});

let messageCount = 0;
let userCount = 0;
let assistantCount = 0;

const chatEntries = [];

for await (const line of rl) {
  if (!line.trim()) continue;
  let entry;
  try {
    entry = JSON.parse(line);
  } catch (err) {
    continue;
  }

  const type = entry.type;
  const timestamp = entry.created_at || '';
  const stepIndex = entry.step_index ?? '';

  if (type === 'USER_INPUT') {
    userCount++;
    messageCount++;
    const content = entry.content || '';
    chatEntries.push({
      step: stepIndex,
      time: timestamp,
      sender: 'USER',
      content: content.trim()
    });
  } else if (type === 'PLANNER_RESPONSE') {
    const content = entry.content || '';
    const toolCalls = entry.tool_calls || [];
    
    let summaryTools = '';
    if (toolCalls.length > 0) {
      const toolSummaries = toolCalls.map(t => {
        const name = t.name || t.toolName || 'tool';
        const act = t.args?.toolAction || t.args?.toolSummary || '';
        return act ? `${name} (${act})` : name;
      }).join(', ');
      summaryTools = `\n*Tools executed: ${toolSummaries}*`;
    }

    if (content.trim() || summaryTools) {
      assistantCount++;
      messageCount++;
      chatEntries.push({
        step: stepIndex,
        time: timestamp,
        sender: 'ASSISTANT',
        content: content.trim() + summaryTools
      });
    }
  }
}

console.log(`\nProcessed ${messageCount} dialogue turns (${userCount} user inputs, ${assistantCount} assistant responses).`);

// 3. Write Chronological Markdown Transcript synchronously
const CHAT_MD_PATH = path.join(TARGET_DIR, 'CHRONOLOGICAL_CHAT.md');
const chatBuffer = [];

chatBuffer.push('# Complete Chronological Conversation History\n');
chatBuffer.push(`- Total Interaction Steps: ${messageCount}`);
chatBuffer.push(`- User Messages: ${userCount}`);
chatBuffer.push(`- Assistant Responses: ${assistantCount}`);
chatBuffer.push(`- Source Session ID: fb050985-1c0b-4b8e-a76e-72d32eabbd09\n`);
chatBuffer.push('---\n');

for (const entry of chatEntries) {
  chatBuffer.push(`## [Step ${entry.step}] ${entry.sender} (${entry.time})\n`);
  chatBuffer.push(`${entry.content}\n`);
  chatBuffer.push('---\n');
}

fs.writeFileSync(CHAT_MD_PATH, chatBuffer.join('\n'), 'utf-8');

// 4. Write README index for subagents
const README_PATH = path.join(TARGET_DIR, 'README.md');
const readmeContent = `# Conversation History & Context Archive

This directory contains the entire conversation transcript from start to finish, preserved so that subagents or collaborators can inspect full context, decisions, guidelines, and directives.

## Directory Structure
- \`CHRONOLOGICAL_CHAT.md\`: Clean, human and LLM-readable Markdown transcript containing all dialogue turns from Step 0 to current.
- \`raw/transcript.jsonl\`: Raw token-efficient JSONL event log.
- \`raw/transcript_full.jsonl\`: Complete untruncated JSONL event log with tool payloads and internal steps.

## Critical Invariants Established Across the Conversation
1. **DO NOT MODIFY \`src/\`**: The production compiler code must remain 100% untouched during the 30-day experimental research track. All experimental code, trials, and research live inside \`MathL/\`.
2. **STRICTLY NO EMOJIS**: Across all code comments, markdown documentation, transcripts, and model outputs.
3. **FOUNDATION**: Mathematical gating based on \`o-bin\`'s proposal (Issue #2), Galois connections, abstract domain lattices, loop widening (\\nabla), and Google V8 C++ error templates (\`message-template.h\`).
4. **CURRENT STATUS**: Days 1 through 5 completed; 23/23 experimental trials in \`MathL/trials/\` passing with 100% success.
`;

fs.writeFileSync(README_PATH, readmeContent, 'utf-8');

console.log(`\nExport complete:`);
console.log(`- ${CHAT_MD_PATH} (${(fs.statSync(CHAT_MD_PATH).size / 1024).toFixed(2)} KB)`);
console.log(`- ${README_PATH}`);
