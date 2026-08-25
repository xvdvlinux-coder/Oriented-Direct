/**
 * Oriented-Direct (.osp) AST Node Definitions
 */

export const ASTNodeType = {
  PROGRAM: 'Program',
  VARIABLE_DECLARATION: 'VariableDeclaration',
  FUNCTION_DECLARATION: 'FunctionDeclaration',
  CLASS_DECLARATION: 'ClassDeclaration',
  STRUCT_DECLARATION: 'StructDeclaration',
  METHOD_DEFINITION: 'MethodDefinition',
  RETURN_STATEMENT: 'ReturnStatement',
  IF_STATEMENT: 'IfStatement',
  WHILE_STATEMENT: 'WhileStatement',
  FOR_STATEMENT: 'ForStatement',
  FOR_C_STATEMENT: 'ForCStatement',
  FOR_RANGE_STATEMENT: 'ForRangeStatement',
  LOOP_STATEMENT: 'LoopStatement',
  BREAK_STATEMENT: 'BreakStatement',
  CONTINUE_STATEMENT: 'ContinueStatement',
  MATCH_STATEMENT: 'MatchStatement',
  TRY_STATEMENT: 'TryStatement',
  THROW_STATEMENT: 'ThrowStatement',
  EXPRESSION_STATEMENT: 'ExpressionStatement',
  BLOCK_STATEMENT: 'BlockStatement',
  IMPORT_DECLARATION: 'ImportDeclaration',
  EXPORT_DECLARATION: 'ExportDeclaration',
  DIRECTIVE_CALL: 'DirectiveCall',
  BINARY_EXPRESSION: 'BinaryExpression',
  UNARY_EXPRESSION: 'UnaryExpression',
  UPDATE_EXPRESSION: 'UpdateExpression',
  ASSIGNMENT_EXPRESSION: 'AssignmentExpression',
  PIPELINE_EXPRESSION: 'PipelineExpression',
  CALL_EXPRESSION: 'CallExpression',
  MEMBER_EXPRESSION: 'MemberExpression',
  ARRAY_LITERAL: 'ArrayLiteral',
  OBJECT_LITERAL: 'ObjectLiteral',
  PROPERTY: 'Property',
  IDENTIFIER: 'Identifier',
  LITERAL: 'Literal',
  TEMPLATE_LITERAL: 'TemplateLiteral',
  ARROW_FUNCTION: 'ArrowFunction',
  THIS_EXPRESSION: 'ThisExpression',
  SUPER_EXPRESSION: 'SuperExpression',
  NEW_EXPRESSION: 'NewExpression',
  TERNARY_EXPRESSION: 'TernaryExpression',
  SPREAD_ELEMENT: 'SpreadElement'
};

export class Node {
  constructor(type, loc = {}) {
    this.type = type;
    this.loc = loc;
  }
}
