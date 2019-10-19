import { fromEvent, interval, Observable } from 'rxjs';
import { tap, skipUntil, takeUntil, takeLast, map, take, finalize } from 'rxjs/operators';
import * as $ from 'jquery';

interface Pos {
  x: number,
  y: number
}
interface Mine {
  type: 'm_0' | 'm_1' | 'm_2' | 'm_3' | 'm_4' | 'm_5' | 'm_6' | 'm_7' | 'm_8' | 'm_mine' | 'm_middle_type',
  status?: 'm_0' | 'm_1' | 'm_2' | 'm_3' | 'm_4' | 'm_5' | 'm_6' | 'm_7' | 'm_8' | 'm_9' | 'm_unhnow2' | 'm_mine' | 'm_notmine' | 'm_bomb' | 'f_0' | 'f_1' | 'f_2' | 'm_normal'
}
interface Chain {
  [key: string]: string
}
interface Axios {
  row: number,
  col: number
}
interface Que {
  index: number
}
const statusChain: Chain = {
  'm_normal': 'f_1',
  'f_1': 'f_2',
  'f_2': 'f_0',
  'f_0': 'f_1',
}
class GameCenter {
  private $game: JQuery = $('#gamebox');
  private $time: JQuery = $('#time');
  private $score: JQuery = $('#score');
  private $gameTable: JQuery = $('#gameTable');
  private $smile: JQuery = $('#smile');
  private $smileChild: JQuery = this.$smile.children();
  private $evenBox: JQuery = $('#evenBox');
  private $winBox: JQuery = $('#evenWin');
  private count: number = 100;
  private row: number = 16;
  private col: number= 30;
  private x: number = 0;
  private y: number = 0;
  private startX: number = 0;
  private startY: number = 0;
  private $theSqure: JQuery;
  private gameIsOver = false;
  private isGamimg: boolean = false;
  private TIME_OUT: number = 600;
  private mines: Mine[][];
  private stopTime$: Observable<Event> = fromEvent(this.$evenBox, 'click');
  private win$: Observable<Event> = fromEvent(this.$winBox, 'click');
  
  private mouseMove$: Observable<Event> = fromEvent(document, 'mousemove');
  private barClick$: Observable<Event> = fromEvent($('#dragBar'), 'mousedown')
  private mouseDrop$: Observable<Event> = fromEvent(document, 'mouseup');

  private restart$: Observable<Event> = fromEvent(this.$smile, 'mousedown');
  private smilMove$: Observable<Event> = fromEvent(this.$smile, 'mousemove');
  private smilDrop$: Observable<Event> = fromEvent(this.$smile, 'mouseup');
  
  private tableMove$: Observable<Event> = fromEvent(this.$gameTable, 'mousemove');
  private stepOn$: Observable<Event> = fromEvent(this.$gameTable, 'mousedown');
  private stepDone$: Observable<Event> = fromEvent(this.$gameTable, 'mouseup');

  private queque: Axios[] = [];
  private todo: Axios[] = [];
  private queOn: Que = { index: 0 };

  public init() {
    printCopyRight();
    this.enableCtrl();
    this.enableMove();
    this.initPos();
    this.start();

    this.enableGaming();
  };
  private moveTo(x: number, y: number) {
    this.$game.css({ left: x + 'px', top: y + 'px' });
  }
  private initPos() {
    let $body: JQuery = $('body');
    let $game = this.$game;
    let x: number = $body.width() / 2 - $game.width() / 2;
    let y: number = $body.height() / 2 - $game.height() / 2;
    this.setPos(x, y);
    $game.css({
      left: this.x,
      top: this.y
    }).fadeIn();
  }
  private enableMove() {
    // this.mouseMove$.pipe(
    //   bufferToggle(
    //     this.barClick$,
    //     (e: MouseEvent) => this.mouseDrop$.pipe(
    //       tap((eEnd: MouseEvent) => {
    //         let x = this.x + eEnd.clientX - e.clientX;
    //         let y = this.y + eEnd.clientY - e.clientY;
    //         this.moveTo(x, y);
    //         this.setPos(x, y);
    //       })
    //     )
    //   )
    // ).subscribe({
    //   next: (e) => {
    //     console.log(e);
    //   }
    // });
    this.mouseMove$.pipe(
      skipUntil(this.barClick$.pipe(
        tap((e: MouseEvent) => {
          this.startX = e.clientX;
          this.startY = e.clientY;
        })
      )),
      map((e: MouseEvent) => {
        let x = this.x + e.clientX - this.startX;
        let y = this.y + e.clientY - this.startY;
        this.moveTo(x, y);
        return (<Pos>{ x, y });
      }),
      takeUntil(this.mouseDrop$),
      takeLast(1),
      finalize(() => {
        this.enableMove(); // 重载
      })
    ).subscribe({
      next: (e: Pos) => {
        this.setPos(e.x, e.y);
      },
      error: (err) => {
        console.log(err.message);
      }
    });
  }
  private enableGaming() {
    this.enableMark();
    this.enableRestart();
    this.enableStepOn();
  }
  private enableMark() {
    fromEvent(this.$gameTable, 'contextmenu').subscribe((e: MouseEvent) => {
      e.preventDefault();
      if (this.gameIsOver) return;
      const $t: JQuery = <any>$(e.target);
      const row: number = +$t.data('row');
      const col: number = +$t.data('col');
      const type: string = $t.attr('class').trim();
      const status: string = statusChain[type];
      $t.attr('class', status);
      this.mines[row][col].status = <any>status;
      const flagsCount: number = $('td.f_1').length;
      numRender(this.count - flagsCount, this.$score);
      if (flagsCount === this.count) {
        this.doCheck();
      }
    });
  }
  private enableRestart()  {
    this.smilMove$.pipe(
      skipUntil(this.restart$.pipe(
        tap(() => {
          this.$smileChild.addClass('d_smile_down');
        })
      )),
      takeUntil(this.smilDrop$),
      finalize(() => {
        this.$smileChild.removeClass('d_smile_down');        
        this.enableRestart();
        this.start();
      })
    ).subscribe();
  }
  private enableStepOn() {
    this.tableMove$.pipe(
      skipUntil(this.stepOn$.pipe(
        tap((e: MouseEvent) => {
          if (!this.isGamimg) {
            this.startTime();
          }
          this.isGamimg = true;
          if (isLeftClick(e)) {
            const $t: JQuery = <any>$(e.target);
            if (!$t.is('.m_normal,.f_0')) throw Error('不是雷区s');
            this.$theSqure = $t;
            $t.attr('class', 'm_0');
          }
        })
      )),
      takeUntil(this.stepDone$.pipe(
        tap((e: MouseEvent) => {
          if (isLeftClick(e)) {
            const $t: JQuery = <any>$(e.target);
            if (!$t.is('.m_0')) throw Error('不是雷区u');
            let row: number = +$t.data('row');
            let col: number = +$t.data('col');
            let mines = this.mines;
            let mine = mines[row][col];
            if (mine.type === 'm_mine') {
              this.boom();
            } else if (mine.type === 'm_0') {
              $t.attr('class','m_0');
              mine.status = 'm_0';
              setQueQue(mines, { row, col }, this.queque, this.todo, this.queOn);
              this.todo.forEach(({row, col}) => {
                let index = row * this.col + col;
                let mine = mines[row][col];
                $('td').eq(index).attr('class', mine.type);
                mine.status = <any>mine.type;
              })
              this.todo = [];
              this.queque = [];
              this.queOn.index = 0;
            } else {
              mine.status = <any>mine.type;
              $t.attr('class', mine.type);
            }
          }
        })
      )),
      finalize(() => {
        this.enableStepOn();
      })
    ).subscribe({
      next: (e: MouseEvent) => {
        if (isLeftClick(e)) {
          const $t: JQuery = <any>$(e.target);
          if ($t.is('.m_normal,.f_1')) {
            this.$theSqure.attr('class', 'm_normal');
            this.$theSqure = $t;
            $t.attr('class', 'm_0');
          }
        }
      },
      error: (err) => console.warn(err.message)
    });
  }
  private setPos(x: number, y: number) {
    this.x = x > 0 ? x : 0;
    this.y = y > 0 ? y : 0;
  }
  private enableCtrl() {
    fromEvent($('#ctrl'), 'mousedown')
      .subscribe((e: MouseEvent) => {
      let $t = $(e.target).parent();
      if ($t.is('.d_button,.d_nbutton')) {
        $t.addClass('d_button_down')
      }
    });
    fromEvent($('#ctrl'), 'mouseup')
      .subscribe((e: MouseEvent) => {
      let $t = $(e.target).parent();
      if ($t.is('.d_button,.d_nbutton')) {
        $t.removeClass('d_button_down')
      }
    })
  }
  private startTime() {
    if (this.isGamimg) return;
    let timer$ = interval(1000);
    timer$.pipe(
      take(this.TIME_OUT),
      takeUntil(this.stopTime$),
      takeUntil(this.win$.pipe(
        tap(() => {
          this.win();
        })
      ))
    ).subscribe({
      next: seconds => {
        numRender(seconds + 1, this.$time);
        if (seconds === this.TIME_OUT - 1) {
          this.boom();
        }
      }
    })
  }
  private boom() {
    this.gameIsOver = true;
    this.$gameTable.html(mineRender(this.row, this.col, this.mines));
    this.$evenBox.click();
    this.$smileChild.addClass('d_smile_over')
  }
  private win() {
    this.gameIsOver = true;
    this.$gameTable.html(mineRender(this.row, this.col, this.mines));
    this.$smileChild.addClass('d_smile_win');
  }
  public start() {
    this.mines = createMine(this.row, this.col, this.count);
    this.gameIsOver = false;
    this.isGamimg = false;
    this.$gameTable.html(mineRender(this.row, this.col, null));
    numRender(this.count, this.$score);
    numRender(0, this.$time);
    this.$smileChild.attr('class', 'd_smile')
  }
  private doCheck() {
    let mines = this.mines;
    let row = this.row;
    let col = this.col;
    for (let i = 0; i < row; i++) {
      for (let j = 0; j < col; j++) {
        let mine = mines[i][j];
        if (mine.status === 'f_1' && mine.type !== 'm_mine') {
          return;
        }
      }
    }
    this.$winBox.click();
  }
}
let game = new GameCenter();
game.init();

function numRender(num: number, $counter: JQuery) {
  let time = '00' + num;
  let sliceAt = time.length  - 3;
  time = time.substr(sliceAt);
  let ge = time.charAt(2);
  let shi = time.charAt(1);
  let bai = time.charAt(0);
  let timeSlice = [
    `<b class="num_${bai}"></b>`,
    `<b class="num_${shi}"></b>`,
    `<b class="num_${ge}"></b>`
  ]
  $counter.html(timeSlice.join(''));
}
function mineRender(row: number, col: number, mines: Mine[][] | null): string {
  let mineCollects = '';
  if (null === mines) {
    let mkMineSlice = (row: number, col: number) => `<td class="m_normal" data-row="${row}" data-col="${col}"></td>`;
    for(let i = 0; i < row; i++) {
      let rowSlice = '<tr>'
      for (let j = 0; j < col; j++) {
        rowSlice += mkMineSlice(i, j);
      }
      rowSlice += '</tr>';
      mineCollects += rowSlice;
    }
    return mineCollects;
  }
  for(let i = 0; i < row; i ++) {
    let rowSlice = '<tr>'
    for (let j = 0; j < col; j++) {
      let mine: Mine = mines[i][j];
      let status = mine.status || mine.type;
      rowSlice += `<td class="${status}"></td>`;
    }
    rowSlice += '</tr>';
    mineCollects += rowSlice;
  }
  return mineCollects;
  
}
function createMine(row: number, col: number, count: number): Mine[][] {
  let mines: Mine[] = [];
  for (let i = 0; i < count; i++) {
    mines.push({ type: 'm_mine', status: 'm_9' });
  }
  let restCount = row * col - count;
  for (let i = 0; i < restCount; i++) {
    mines.push({ type: 'm_middle_type' });
  }
  // 计算 m_middle_type 的终值；
  mines = setMMideType(row, col, mines);
  let minesData: Mine[][] = [];
  for (let i = 0; i < row; i++) {
    let rowMine: Mine[] = [];
    for (let j = 0; j < col; j++) {
      rowMine.push(mines[i * col + j])
    }
    minesData.push(rowMine);
  }
  return minesData;
}
function shaffle(mine: Mine[], count:number = 1): Mine[] {
  for (let i = 1; i < mine.length; i++) {
    const random  = Math.floor(Math.random() * (i + 1));
    [mine[i], mine[random]] = [mine[random], mine[i]]
  }
  if (count < 2) {
    count ++;
    return shaffle(mine, count);
  }
  return mine;
}
function setMMideType(row: number, col: number, mines: Mine[]): Mine[] {
  mines = shaffle(mines);
  let len = row * col;
  for (let i = 0; i < len; i++) {
    let mine = mines[i];
    if (isMiddeType(mine)) {
      let count: number = 0;
      let posTopLeft, posTop, posTopRight, posLeft, posRight, posBottomLeft, posBottom, posBottomRight;
      posTopLeft = i - col - 1;
      posTop = i - col;
      posTopRight = i - col + 1;
      posLeft = i - 1;
      posRight = i + 1;
      posBottomLeft = i + col - 1;
      posBottom = i + col;
      posBottomRight = i + col + 1;
      if (posTopLeft >= 0 && 
        isNotRemain0(posTopLeft + 1) &&
        isMine(mines[posTopLeft])) {
        count += 1;
      }
      if (posTop >= 0 &&
        isMine(mines[posTop])) {
        count += 1;
      }
      if (posTopRight >= 0 &&
        isNotRemain0(posTopRight) &&
        isMine(mines[posTopRight])) {
        count += 1;  
      }
      if (posLeft >= 0 &&
        isNotRemain0(posLeft + 1) &&
        isMine(mines[posLeft])) {
        count += 1;
      }
      if (posRight < len &&
        isNotRemain0(posRight) &&
        isMine(mines[posRight])) {
        count += 1;
      }
      if (posBottomLeft < len &&
        isNotRemain0(posBottomLeft + 1) &&
        isMine(mines[posBottomLeft])) {
        count += 1;
      }
      if (posBottom < len &&
        isMine(mines[posBottom])) {
        count += 1;
      }
      if (posBottomRight < len &&
        isNotRemain0(posBottomRight) &&
        isMine(mines[posBottomRight])) {
        count += 1;
      }
      mine.type = <any>(`m_${count}`);
    }
  }
  function isMiddeType(mine: Mine): boolean {
     return mine.type === 'm_middle_type';
  }
  function isMine(mine: Mine): boolean {
     return mine.type === 'm_mine';
  }
  function isNotRemain0(num: number): boolean {
    return num % col !== 0;
  }
  return mines;
}
function isLeftClick(e: MouseEvent): boolean {
  return e.which === 1;
}
function setQueQue(mines: Mine[][], squre: Axios, queque: Axios[], todo: Axios[], queOn: Que): any {
  let ROW = mines.length;
  let COL = mines[0].length;
  let { row, col } = squre;
  const slot = [-1, 0 , 1];
  for (let i = 0; i < 3; i ++) {
    inner: for (let j = 0; j < 3; j++) {
      let rowO = row + slot[i];
      let colO = col + slot[j];
      if ((rowO >= 0 && rowO < ROW) &&
        (colO >= 0 && colO < COL)) {
        if (colO === col && rowO === row) {
          continue inner;
        }
        let mine = mines[rowO][colO];
        if (void 0 === mine.status && mine.type === 'm_0') {
          let queExist = queque.some(que =>
            que.row === rowO && que.col === colO);
          if (!queExist) {
            queque.push({ row: rowO, col: colO })
          }
        }
        let todoExist = todo.some(td => 
          td.row === rowO && td.col === colO);
        if (!todoExist) {
          todo.push({ row: rowO, col: colO });
        }
      }
    }
  }
  let next = queque[queOn.index];
  queOn.index += 1;
  if (next) {
    return setQueQue(mines, next, queque, todo, queOn);
  }
}

function printCopyRight(): void {
  let info = `
  JavaScript版扫雷采集自：
    网址: http://cctvjs.net/mine/
    作者: Freewind，
    Email: freewind22#163.com

  此项目拿来者：
    码工: 鲜成
    特色: rxjs, TS
    Email: shawnnxian@gmail.com
  `;
  console.log(info)
}
