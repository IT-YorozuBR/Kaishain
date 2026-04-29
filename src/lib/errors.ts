export class UnauthorizedError extends Error {
  constructor(message = 'Acao nao permitida.') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class NotFoundError extends Error {
  constructor(message = 'Registro nao encontrado.') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message = 'Dados invalidos.') {
    super(message);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends Error {
  constructor(message = 'Registro ja existe.') {
    super(message);
    this.name = 'ConflictError';
  }
}
