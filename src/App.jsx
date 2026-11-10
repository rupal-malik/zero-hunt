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
    const hint = sum === 0
      ? "These three make zero. Lock in the triplet."
      : sum < 0
        ? "The sum is below zero. Move L right to increase it."
        : "The sum is above zero. Move R left to decrease it.";
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
