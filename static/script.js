let timeLeft = 600;
let timerId = null;
let deathTriggered = false;
let moodTimeoutId = null;  // 추가: 멘트 자동전환 타이머 ID

function getPlantSuffix(stage) {
  const names = {
    1: "seed", 2: "sprout", 3: "small_sprout", 4: "mid_sprout",
    5: "large_sprout", 6: "bud", 7: "small_flower", 8: "full_bloom",
    9: "wilt_1", 10: "wilt_2", 11: "dead"
  };
  return names[stage];
}

function saveState(score, stage) {
  localStorage.setItem("score", score);
  localStorage.setItem("plant_stage", stage);
}

function loadState() {
  const savedScore = parseInt(localStorage.getItem("score"));
  const savedStage = parseInt(localStorage.getItem("plant_stage"));
  return {
    score: isNaN(savedScore) ? 0 : savedScore,
    plant_stage: isNaN(savedStage) ? 1 : savedStage
  };
}

function showSpeech(category) {
  fetch(`/get_message/${category}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById("speech-text").innerText = data.message;
      if (moodTimeoutId) clearTimeout(moodTimeoutId);   // 이전 타이머 삭제
      moodTimeoutId = setTimeout(() => {
        fetch('/get_message/mood')
          .then(res => res.json())
          .then(mood => {
            if (!deathTriggered) {
              document.getElementById("speech-text").innerText = mood.message;
            }
          });
      }, 30000);
    });
}

function showCustomSpeech(text) {
  document.getElementById("speech-text").innerText = text;
  if (moodTimeoutId) clearTimeout(moodTimeoutId);  // 이전 타이머 삭제
  moodTimeoutId = setTimeout(() => {
    fetch('/get_message/mood')
      .then(res => res.json())
      .then(data => {
        if (!deathTriggered) {
          document.getElementById("speech-text").innerText = data.message;
        }
      });
  }, 30000);
}

function handleDeath() {
  deathTriggered = true;
  document.getElementById("overlay").style.display = "block";
  document.querySelectorAll(".btn").forEach(btn => btn.disabled = true);
  showCustomSpeech("너님은 날 죽엿서... 새로운 씨앗을 입양해야합니다.");
  document.getElementById("resetBtn").style.display = "block";
}

function updateUI(data) {
  document.getElementById("score").innerText = `점수: ${data.score}`;
  document.getElementById("plant").src = `/static/images/plant_${data.plant_stage}_${getPlantSuffix(data.plant_stage)}.png`;

  if (data.plant_stage === 11 && !deathTriggered) {
    handleDeath();
  } else if (deathTriggered && data.plant_stage < 11) {
    deathTriggered = false;
    document.getElementById("overlay").style.display = "none";
    document.querySelectorAll(".btn").forEach(btn => btn.disabled = false);
    document.getElementById("resetBtn").style.display = "none";
  }
}

function updateTimer() {
  let min = Math.floor(timeLeft / 60);
  let sec = timeLeft % 60;
  document.getElementById("timer").innerText = `남은 시간: ${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  timeLeft--;

  if (timeLeft < 0) {
    fetch('/decrease_score')
      .then(res => res.json())
      .then(data => {
        updateUI(data);
        saveState(data.score, data.plant_stage);
        if (!deathTriggered) {
          showSpeech("mood");
        }
      });
    timeLeft = 600;
  }
}

function startTimer() {
  if (timerId) clearInterval(timerId);
  timeLeft = 600;
  updateTimer();
  timerId = setInterval(updateTimer, 1000);
}

document.getElementById("waterBtn").addEventListener("click", () => {
  if (deathTriggered) return;
  fetch('/increase_score')
    .then(res => res.json())
    .then(data => {
      updateUI(data);
      saveState(data.score, data.plant_stage);
      if (!deathTriggered) {
        showSpeech("water");
      }
      startTimer();
    });
});

document.getElementById("sunBtn").addEventListener("click", () => {
  if (deathTriggered) return;
  fetch('/increase_score')
    .then(res => res.json())
    .then(data => {
      updateUI(data);
      saveState(data.score, data.plant_stage);
      if (!deathTriggered) {
        showSpeech("sunlight");
      }
      startTimer();
    });
});

document.getElementById("attackBtn").addEventListener("click", () => {
  if (deathTriggered) return;
  fetch('/decrease_score_by_attack')
    .then(res => res.json())
    .then(data => {
      updateUI(data);
      saveState(data.score, data.plant_stage);
      if (!deathTriggered) {
        showSpeech("attack");
      }
    });
});

document.getElementById("resetBtn").addEventListener("click", () => {
  fetch('/reset')
    .then(res => res.json())
    .then(data => {
      deathTriggered = false;
      document.getElementById("overlay").style.display = "none";
      document.querySelectorAll(".btn").forEach(btn => btn.disabled = false);
      document.getElementById("resetBtn").style.display = "none";
      document.getElementById("score").innerText = `점수: ${data.score}`;
      document.getElementById("plant").src = `/static/images/plant_${data.plant_stage}_${getPlantSuffix(data.plant_stage)}.png`;
      localStorage.removeItem("score");
      localStorage.removeItem("plant_stage");
      showCustomSpeech("스푸라우투 기분 좋음ㅋㅎ");
      startTimer();
    });
});

window.onload = () => {
  const state = loadState();
  document.getElementById("score").innerText = `점수: ${state.score}`;
  document.getElementById("plant").src =
    `/static/images/plant_${state.plant_stage}_${getPlantSuffix(state.plant_stage)}.png`;
  if (state.plant_stage === 11) {
    document.getElementById("resetBtn").style.display = "block";
    deathTriggered = true;
    document.getElementById("overlay").style.display = "block";
    document.querySelectorAll(".btn").forEach(btn => btn.disabled = true);
  }
  startTimer();
};
