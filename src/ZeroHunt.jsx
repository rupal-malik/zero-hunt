import { useEffect, useMemo, useState } from "react";

const ROUNDS = [
    { title: "The warm-up", values: [-1, 0, 1, 2, -1, -4] },
    { title: "The duplicate trap", values: [0, 0, 0, 0, 0] },
    { title: "Cross currents", values: [3, -2, 1, 0, -1, 2, -1] },
    { title: "No easy pair", values: [-5, -2, 1, 4, 7] },
    { title: "Double landing", values: [-2, 0, 1, 1, 2, -1] },
];

function findTriplets(values) {
    const nums = [...values].sort((a, b) => a - b);
    const found = [];
    for (let i = 0; i < nums.length - 2; i += 1) {
        if (i > 0 && nums[i] === nums[i - 1]) continue;
        let left = i + 1;
        let right = nums.length - 1;
        while (left < right) {
            const sum = nums[i] + nums[left] + nums[right];
            if (sum === 0) {
                found.push([nums[i], nums[left], nums[right]]);
                left += 1;
                right -= 1;
                while (left < right && nums[left] === nums[left - 1]) left += 1;
                while (left < right && nums[right] === nums[right + 1]) right -= 1;
            } else if (sum < 0) left += 1;
            else right -= 1;
        }
    }
    return found;
}

function makeGame(roundIndex, message = "Array sorted. Pin the first value as your anchor, then scan with L and R.") {
    const nums = [...ROUNDS[roundIndex].values].sort((a, b) => a - b);
    return {
        roundIndex,
        nums,
        i: 0,
        left: 1,
        right: nums.length - 1,
        found: [],
        score: 100,
        complete: nums.length < 3,
        feedback: { kind: "info", message },
    };
}

function actionFor(game) {
    const sum = game.nums[game.i] + game.nums[game.left] + game.nums[game.right];
    return sum < 0 ? "left" : sum > 0 ? "right" : "hit";
}

function advance(game, action) {
    if (game.complete) return game;

    const { nums, i, left, right } = game;
    const sum = nums[i] + nums[left] + nums[right];
    const expected = sum < 0 ? "left" : sum > 0 ? "right" : "hit";

    if (action !== expected) {
        const hint = sum === 0 ?
            "These three make zero. Lock in the triplet." :
            sum < 0 ?
            "The sum is below zero. Move L right to increase it." :
            "The sum is above zero. Move R left to decrease it.";
        return {
            ...game,
            score: Math.max(0, game.score - 5),
            feedback: { kind: "bad", message: `Not this move. ${hint} −5 points.` },
        };
    }

    let nextLeft = left;
    let nextRight = right;
    let nextFound = game.found;
    let message;
    let kind = "good";

    if (sum < 0) {
        nextLeft += 1;
        message = `Correct. ${nums[i]} + ${nums[left]} + ${nums[right]} = ${sum}. Move L right to grow the sum.`;
    } else if (sum > 0) {
        nextRight -= 1;
        message = `Correct. ${nums[i]} + ${nums[left]} + ${nums[right]} = ${sum}. Move R left to shrink the sum.`;
    } else {
        const triplet = [nums[i], nums[left], nums[right]];
        nextFound = [...game.found, triplet];
        nextLeft += 1;
        nextRight -= 1;
        while (nextLeft < nextRight && nums[nextLeft] === nums[nextLeft - 1]) nextLeft += 1;
        while (nextLeft < nextRight && nums[nextRight] === nums[nextRight + 1]) nextRight -= 1;
        message = `Triplet locked: ${triplet.join(" + ")} = 0. Both pointers move; repeated values are skipped.`;
    }

    let nextI = i;
    if (nextLeft >= nextRight) {
        nextI += 1;
        while (nextI < nums.length - 2 && nums[nextI] === nums[nextI - 1]) nextI += 1;
        if (nextI >= nums.length - 2) {
            return {
                ...game,
                found: nextFound,
                complete: true,
                feedback: { kind, message: nextFound.length ? "Round clear. You found every unique triplet." : "Round clear. No triplets sum to zero." },
            };
        }
        nextLeft = nextI + 1;
        nextRight = nums.length - 1;
    }

    return {
        ...game,
        i: nextI,
        left: nextLeft,
        right: nextRight,
        found: nextFound,
        feedback: { kind, message },
    };
}

function PointerCell({ value, index, game }) {
    const labels = [];
    if (index === game.i) labels.push("i");
    if (index === game.left) labels.push("L");
    if (index === game.right) labels.push("R");
    const classes = ["cell"];
    if (index === game.i) classes.push("anchor");
    if (index === game.left) classes.push("left");
    if (index === game.right) classes.push("right");

    return ( <div className = { classes.join(" ") }
            role = "listitem"
            aria-label = { `Index ${index}, value ${value}${labels.length ? `, pointer ${labels.join(" and ")}` : ""}`
}>
      <span className="idx">{index}</span>{value}
      {labels.length > 0 && <span className="pointer-label">{labels.join("/")}</span>}
    </div>
  );
}

function Triplet({ values }) {
  return (
    <div className="triplet">
      {values.map((value, index) => (
        <span className="triplet-part" key={`${value}-${index}`}>
          {index > 0 && <span className="triplet-plus">+</span>}
          <span className="n">{value}</span>
        </span>
      ))}
      <span className="check" aria-label="found">✓</span>
    </div>
  );
}

export default function ZeroHunt() {
  const [mode, setMode] = useState("guided");
  const [roundIndex, setRoundIndex] = useState(0);
  const [game, setGame] = useState(() => makeGame(0));

  const expectedTriplets = useMemo(() => findTriplets(ROUNDS[roundIndex].values), [roundIndex]);
  const sum = game.nums[game.i] + game.nums[game.left] + game.nums[game.right];
  const progress = expectedTriplets.length
    ? Math.round((game.found.length / expectedTriplets.length) * 100)
    : game.complete ? 100 : 0;

  function restart(message) {
    setGame(makeGame(roundIndex, message));
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    restart(nextMode === "guided"
      ? "Guided run is on. Step through each comparison and watch the pointer rule in action."
      : "Your move is on. Choose the action that moves the sum toward zero.");
  }

  function step() {
    setGame((current) => advance(current, actionFor(current)));
  }

  useEffect(() => {
    function onKeyDown(event) {
      if (event.code === "Space" && mode === "guided" && !event.repeat) {
        event.preventDefault();
        setGame((current) => advance(current, actionFor(current)));
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mode]);

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">0</span> Algorithm Arcade</div>
        <div className="top-right"><span><i className="live-dot" />LEARNING MODE</span><span>ARRAYS / 0015</span></div>
      </header>

      <section className="hero">
        <div>
          <div className="eyebrow">LeetCode 15 · Two pointers</div>
          <h1>ZERO <span>HUNT</span></h1>
          <p>Lock an anchor. Close in from both ends. Find every unique trio that lands on zero.</p>
        </div>
        <div className="hero-stamp"><strong>ROUND {String(roundIndex + 1).padStart(2, "0")} / {String(ROUNDS.length).padStart(2, "0")}</strong>SORT → SCAN → SKIP</div>
      </section>

      <section className="toolbar" aria-label="Game controls">
        <div className="mode-switch" role="group" aria-label="Game mode">
          <button className={`mode-btn ${mode === "guided" ? "active" : ""}`} aria-pressed={mode === "guided"} onClick={() => changeMode("guided")}>Guided run</button>
          <button className={`mode-btn ${mode === "challenge" ? "active" : ""}`} aria-pressed={mode === "challenge"} onClick={() => changeMode("challenge")}>Your move</button>
        </div>
        <label className="select-wrap">ROUND
          <select aria-label="Choose a round" value={roundIndex} onChange={(event) => {
            const next = Number(event.target.value);
            setRoundIndex(next);
            setGame(makeGame(next));
          }}>
            {ROUNDS.map((round, index) => <option value={index} key={round.title}>{String(index + 1).padStart(2, "0")} · {round.title}</option>)}
          </select>
        </label>
        <button className="reset-btn" onClick={() => restart()}>↻ Restart</button>
      </section>

      <section className="layout">
        <article className="main-card">
          <div className="card-head">
            <div><div className="kicker">Pointer lab / current array</div><h2>{ROUNDS[roundIndex].title}</h2></div>
            <div className="complexity">TIME <b>O(n²)</b></div>
          </div>
          <div className="board">
            <div className="array-label"><span>Sorted values <span className="quiet">·</span> index below</span><span>{game.complete ? "scan complete" : `i = ${game.i}`}</span></div>
            <div className="array" role="list" aria-label="Sorted array">
              {game.nums.map((value, index) => <PointerCell value={value} index={index} game={game} key={`${index}-${value}`} />)}
            </div>
            <div className="sum-row" aria-live="polite">
              <span className="sum-token">i · <strong>{game.complete ? "—" : game.nums[game.i]}</strong></span><span className="sum-eq">+</span>
              <span className="sum-token">L · <strong>{game.complete ? "—" : game.nums[game.left]}</strong></span><span className="sum-eq">+</span>
              <span className="sum-token">R · <strong>{game.complete ? "—" : game.nums[game.right]}</strong></span><span className="sum-eq">=</span>
              <span className="sum-token sum-result">{game.complete ? "—" : sum}</span>
            </div>
            <div className="rule-line" />
            <div className={`feedback ${game.feedback.kind}`} aria-live="polite">
              <span className="symbol">{game.feedback.kind === "good" ? "✓" : game.feedback.kind === "bad" ? "!" : "→"}</span>
              <span>{game.feedback.message}</span>
            </div>
          </div>
          <div className="controls">
            {game.complete ? <>
              <button className="primary-btn" onClick={() => restart()}>↻ Play this round again</button>
              <span className="shortcut">ROUND CLEARED{mode === "challenge" ? ` · SCORE ${game.score}` : " · NICE WORK"}</span>
            </> : mode === "guided" ? <>
              <button className="primary-btn" onClick={step}>Run next step <span aria-hidden="true">→</span></button>
              <span className="shortcut">SPACE TO STEP</span>
            </> : <>
              <span className="kicker choose-label">Choose:</span>
              <button className="choice-btn blue" onClick={() => setGame((current) => advance(current, "left"))}>Move L →</button>
              <button className="choice-btn yellow" onClick={() => setGame((current) => advance(current, "right"))}>Move R ←</button>
              <button className="choice-btn green" onClick={() => setGame((current) => advance(current, "hit"))}>Lock in triplet ✓</button>
              <span className="shortcut">SCORE {game.score}</span>
            </>}
          </div>
        </article>

        <aside className="side-card">
          <div className="side-title"><h3>Triplets found</h3><span className="found-count">{String(game.found.length).padStart(2, "0")} / {String(expectedTriplets.length).padStart(2, "0")}</span></div>
          <div className="triplet-list">
            {game.found.length === 0
              ? <div className="empty-state">No triplets yet.<br />Your first zero is waiting.</div>
              : game.found.map((triplet, index) => <Triplet values={triplet} key={`${triplet.join(",")}-${index}`} />)}
          </div>
          <div className="progress-wrap">
            <div className="progress-caption"><span>ROUND PROGRESS</span><span>{progress}%</span></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="rule-box"><h4>Pointer rules</h4>
            <div className="rule"><code>sum &lt; 0</code><span>Move L right to grow the sum.</span></div>
            <div className="rule"><code>sum &gt; 0</code><span>Move R left to shrink the sum.</span></div>
            <div className="rule"><code>sum = 0</code><span>Save it. Move both, skip duplicates.</span></div>
          </div>
          <div className="mini-code">
            <div><span className="hot">for</span> each anchor <span className="hot">i</span></div>
            <div>　L = i + 1; R = end</div>
            <div><span className="hot">while</span> L &lt; R:</div>
            <div>　sum = nums[i] + nums[L] + nums[R]</div>
            <div>　<span className="cool">sum &lt; 0</span> → L++　<span className="gold">sum &gt; 0</span> → R--</div>
            <div>　sum = 0 → save &amp; skip repeats</div>
          </div>
        </aside>
      </section>

      <footer className="bottom-note"><span><strong>DESIGNED TO MAKE THE POINTERS CLICK.</strong> No speedrun required.</span><span>SPACE · NEXT STEP &nbsp; / &nbsp; 0 DUPLICATE TRIPLETS</span></footer>
    </main>
  );
}