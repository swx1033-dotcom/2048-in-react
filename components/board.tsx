import { useCallback, useContext, useEffect, useRef } from "react";
import { Tile as TileModel } from "@/models/tile";
import styles from "@/styles/board.module.css";
import Tile from "./tile";
import { GameContext } from "@/context/game-context";
import { useInputController, GameAction } from "@/inputs";
import Splash from "./splash";

export default function Board() {
  const { getTiles, moveTiles, startGame, status } = useContext(GameContext);
  const initialized = useRef(false);

  const handleGameAction = useCallback(
    (action: GameAction) => {
      moveTiles(action.type);
    },
    [moveTiles],
  );

  useInputController(handleGameAction);

  useEffect(() => {
    if (initialized.current === false) {
      startGame();
      initialized.current = true;
    }
  }, [startGame]);

  const renderGrid = () => {
    const cells: JSX.Element[] = [];
    const totalCellsCount = 16;

    for (let index = 0; index < totalCellsCount; index += 1) {
      cells.push(<div className={styles.cell} key={index} />);
    }

    return cells;
  };

  const renderTiles = () => {
    return getTiles().map((tile: TileModel) => (
      <Tile key={`${tile.id}`} {...tile} />
    ));
  };

  return (
    <div className={styles.board}>
      {status === "won" && <Splash heading="You won!" type="won" />}
      {status === "lost" && <Splash heading="You lost!" />}
      <div className={styles.tiles}>{renderTiles()}</div>
      <div className={styles.grid}>{renderGrid()}</div>
    </div>
  );
}