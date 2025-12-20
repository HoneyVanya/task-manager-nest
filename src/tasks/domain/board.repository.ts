import { Board } from './board.entity';

export type Transaction = unknown;

export interface BoardRepository {
  save(board: Board, tx?: Transaction): Promise<Board>;
  findPrivateByOwner(ownerId: string): Promise<Board | null>;
}
