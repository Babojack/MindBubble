document.addEventListener('DOMContentLoaded', function () {
  const canvas = document.getElementById('bubbleCanvas');
  const ctx = canvas.getContext('2d');
  let bubbles = JSON.parse(localStorage.getItem('bubbles')) || [];
  let draggedBubble = null;
  let offsetX, offsetY;
  let gravityMode = false;
  let basketballMode = false;
  const gravityStrength = 0.3;
  const bounceFactor = 0.7;

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  resizeCanvas();
  window.addEventListener('resize', function () {
    resizeCanvas();
  });

  // Подключаем Lottie анимацию
  const lottieAnimation = lottie.loadAnimation({
    container: document.getElementById('lottieAnimation'),
    renderer: 'svg',
    loop: false,
    autoplay: false,
    path: 'Animation - 1727712359432.json'
  });

  function playLottieAnimation() {
    const lottieDiv = document.getElementById('lottieAnimation');
    lottieDiv.style.display = 'block';
    lottieAnimation.goToAndPlay(0, true);
    lottieAnimation.addEventListener('complete', function () {
      lottieDiv.style.display = 'none';
    });
  }

  function getBasketDimensions() {
    return {
      x: canvas.width - 200,
      y: canvas.height - 150,
      width: 120,
      height: 10,
      netHeight: 70
    };
  }

  let basket = getBasketDimensions();

  function saveBubblesToLocalStorage() {
    localStorage.setItem('bubbles', JSON.stringify(bubbles));
  }

  function showModal() {
    document.getElementById('modalForm').style.display = 'block';
    document.getElementById('modalOverlay').style.display = 'block';
  }

  function closeModal() {
    document.getElementById('modalForm').style.display = 'none';
    document.getElementById('modalOverlay').style.display = 'none';
  }

  function createBubbleFromForm() {
    const text = document.getElementById('bubbleText').value;
    const priority = document.querySelector('input[name="priority"]:checked') ? parseInt(document.querySelector('input[name="priority"]:checked').value) : null;

    if (priority === 101) {
      alert("Whats happening with you? I said to cap it at 100! Jesus!");
      return;
    }

    if (text && priority) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const finalRadius = (priority / 100) * (canvas.width * 0.05) + 20;
      const bubble = {
        x,
        y,
        radius: finalRadius,
        dx: (Math.random() - 0.5) * 5,
        dy: (Math.random() - 0.5) * 5,
        text,
        priority,
        fontSize: finalRadius / 2
      };

      let fontSize = finalRadius / 2;
      ctx.font = `${fontSize}px Arial`;
      while (ctx.measureText(text).width > finalRadius * 1.8) {
        fontSize -= 1;
        ctx.font = `${fontSize}px Arial`;
      }
      bubble.fontSize = fontSize;

      bubbles.push(bubble);
      saveBubblesToLocalStorage();
      closeModal();
    } else {
      alert("Please enter text and select priority!");
    }
  }

  document.getElementById('basketballMode').addEventListener('click', function () {
    basketballMode = true;
    gravityMode = false;
  });

  document.getElementById('gravityMode').addEventListener('click', function () {
    gravityMode = true;
    basketballMode = false;
  });

  document.getElementById('addBubble').addEventListener('click', showModal);
  document.getElementById('submitBubble').addEventListener('click', createBubbleFromForm);
  document.getElementById('cancelBubble').addEventListener('click', closeModal);

  function drawBasketballHoop() {
    basket = getBasketDimensions();
    ctx.fillStyle = 'orange';
    ctx.fillRect(basket.x, basket.y, basket.width, basket.height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(basket.x, basket.y + basket.height, basket.width, basket.netHeight);
    ctx.strokeStyle = 'black';
    ctx.strokeRect(basket.x, basket.y + basket.height, basket.width, basket.netHeight);
    ctx.fillStyle = '#000000';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("Done? Drop your balls here.", basket.x + basket.width / 2, basket.y - 20);
  }

  function drawTextInBubble(ctx, text, x, y, radius, fontSize) {
    ctx.font = `${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.fillText(text, x, y);
  }

  function drawDeleteButton(bubble) {
    const deleteButtonSize = bubble.radius / 3;
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(bubble.x - bubble.radius + deleteButtonSize, bubble.y - bubble.radius + deleteButtonSize, deleteButtonSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
    ctx.fillStyle = '#ffffff';
    ctx.font = `${deleteButtonSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('X', bubble.x - bubble.radius + deleteButtonSize, bubble.y - bubble.radius + deleteButtonSize);
  }

  function getLinearGradient(ctx, x, y, radius, colorStart, colorEnd) {
    const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    gradient.addColorStop(0, colorStart);
    gradient.addColorStop(1, colorEnd);
    return gradient;
  }

  function distanceBetween(bubble1, bubble2) {
    const dx = bubble2.x - bubble1.x;
    const dy = bubble2.y - bubble1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function resolveCollision(bubble1, bubble2) {
    const xVelocityDiff = bubble1.dx - bubble2.dx;
    const yVelocityDiff = bubble1.dy - bubble2.dy;
    const xDist = bubble2.x - bubble1.x;
    const yDist = bubble2.y - bubble1.y;

    if (xVelocityDiff * xDist + yVelocityDiff * yDist >= 0) {
      const angle = -Math.atan2(bubble2.y - bubble1.y, bubble2.x - bubble1.x);
      const u1 = rotate({ dx: bubble1.dx, dy: bubble1.dy }, angle);
      const u2 = rotate({ dx: bubble2.dx, dy: bubble2.dy }, angle);
      const v1 = { dx: u2.dx, dy: u1.dy };
      const v2 = { dx: u1.dx, dy: u2.dy };
      const vFinal1 = rotate(v1, -angle);
      const vFinal2 = rotate(v2, -angle);
      bubble1.dx = vFinal1.dx;
      bubble1.dy = vFinal1.dy;
      bubble2.dx = vFinal2.dx;
      bubble2.dy = vFinal2.dy;
    }
  }

  function rotate(velocity, angle) {
    return {
      dx: velocity.dx * Math.cos(angle) - velocity.dy * Math.sin(angle),
      dy: velocity.dx * Math.sin(angle) + velocity.dy * Math.cos(angle)
    };
  }

  function isInBasket(bubble) {
    return (
      gravityMode &&
      bubble.x > basket.x &&
      bubble.x < basket.x + basket.width &&
      bubble.y + bubble.radius > basket.y &&
      bubble.y - bubble.radius < basket.y + basket.netHeight
    );
  }

  function animateBubbles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (gravityMode) {
      drawBasketballHoop();
    }

    bubbles = bubbles.filter(bubble => {
      if (isInBasket(bubble)) {
        playLottieAnimation();
        return false;
      }

      let fillColor;
      if (bubble.priority <= 50) {
        fillColor = getLinearGradient(ctx, bubble.x, bubble.y, bubble.radius, 'rgba(0, 255, 128, 1)', 'rgba(0, 128, 64, 1)');
      } else if (bubble.priority <= 80) {
        fillColor = getLinearGradient(ctx, bubble.x, bubble.y, bubble.radius, 'rgba(255, 255, 128, 1)', 'rgba(255, 204, 0, 1)');
      } else {
        fillColor = getLinearGradient(ctx, bubble.x, bubble.y, bubble.radius, 'rgba(255, 102, 102, 1)', 'rgba(204, 0, 0, 1)');
      }

      ctx.beginPath();
      ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.closePath();

      drawTextInBubble(ctx, bubble.text, bubble.x, bubble.y, bubble.radius, bubble.fontSize);
      drawDeleteButton(bubble);

      if (!draggedBubble || draggedBubble !== bubble) {
        bubble.x += bubble.dx;
        bubble.y += bubble.dy;

        if (gravityMode) {
          bubble.dy += gravityStrength;
        }

        if (bubble.y + bubble.radius > canvas.height) {
          bubble.y = canvas.height - bubble.radius;
          bubble.dy = -bubble.dy * bounceFactor;
        }

        if (bubble.y - bubble.radius < 0) {
          bubble.y = bubble.radius;
          bubble.dy = -bubble.dy * bounceFactor;
        }

        if (bubble.x + bubble.radius > canvas.width || bubble.x - bubble.radius < 0) {
          bubble.dx = -bubble.dx * 0.9;
        }
      }

      for (let j = bubbles.indexOf(bubble) + 1; j < bubbles.length; j++) {
        const otherBubble = bubbles[j];
        if (distanceBetween(bubble, otherBubble) < bubble.radius + otherBubble.radius) {
          resolveCollision(bubble, otherBubble);
        }
      }

      return true;
    });

    requestAnimationFrame(animateBubbles);
  }

  canvas.addEventListener('mousedown', function (e) {
    const clickX = e.clientX;
    const clickY = e.clientY;

    bubbles = bubbles.filter(bubble => {
      const distToBubbleCenter = Math.sqrt((clickX - bubble.x) ** 2 + (clickY - bubble.y) ** 2);
      const deleteButtonSize = bubble.radius / 3;

      // Определяем координаты для кнопки удаления относительно бабла
      const deleteX = bubble.x - bubble.radius + deleteButtonSize;
      const deleteY = bubble.y - bubble.radius + deleteButtonSize;

      const distToDeleteButton = Math.sqrt((clickX - deleteX) ** 2 + (clickY - deleteY) ** 2);

      // Удаляем бабл, если нажата кнопка 'X'
      if (distToDeleteButton < deleteButtonSize) {
        return false; // Бабл удаляется
      }

      // Перетаскиваем бабл, если нажали на сам бабл
      if (distToBubbleCenter < bubble.radius) {
        draggedBubble = bubble;
        offsetX = clickX - bubble.x;
        offsetY = clickY - bubble.y;
      }

      return true; // Бабл остаётся, если не удаляется
    });

    saveBubblesToLocalStorage();
});


  canvas.addEventListener('mousemove', function (e) {
    if (draggedBubble) {
      const moveX = e.clientX;
      const moveY = e.clientY;
      draggedBubble.x = moveX - offsetX;
      draggedBubble.y = moveY - offsetY;
    }
  });

  canvas.addEventListener('mouseup', function () {
    if (draggedBubble) {
      draggedBubble.dx = (Math.random() - 0.5) * 5;
      draggedBubble.dy = (Math.random() - 0.5) * 5;
      draggedBubble = null;
    }

    saveBubblesToLocalStorage();
  });

  // Обработка сенсорных событий для мобильных устройств
  canvas.addEventListener('touchstart', function (e) {
    const touch = e.touches[0];
    const touchX = touch.clientX;
    const touchY = touch.clientY;

    bubbles = bubbles.filter(bubble => {
      const dist = Math.sqrt((touchX - bubble.x) ** 2 + (touchY - bubble.y) ** 2);
      const deleteButtonSize = bubble.radius / 3;
      const deleteX = bubble.x - bubble.radius + deleteButtonSize;
      const deleteY = bubble.y - bubble.radius + deleteButtonSize;

      if (dist < deleteButtonSize && Math.abs(touchX - deleteX) < deleteButtonSize && Math.abs(touchY - deleteY) < deleteButtonSize) {
        return false;
      }

      if (dist < bubble.radius) {
        draggedBubble = bubble;
        offsetX = touchX - bubble.x;
        offsetY = touchY - bubble.y;
      }

      return true;
    });

    saveBubblesToLocalStorage();
  });

  canvas.addEventListener('touchmove', function (e) {
    if (draggedBubble) {
      const touch = e.touches[0];
      const moveX = touch.clientX;
      const moveY = touch.clientY;
      draggedBubble.x = moveX - offsetX;
      draggedBubble.y = moveY - offsetY;
    }
  });

  canvas.addEventListener('touchend', function () {
    if (draggedBubble) {
      draggedBubble.dx = (Math.random() - 0.5) * 5;
      draggedBubble.dy = (Math.random() - 0.5) * 5;
      draggedBubble = null;
    }

    saveBubblesToLocalStorage();
  });

  animateBubbles();

  const introModal = document.getElementById('introModal');
  const closeIntro = document.getElementById('closeIntro');

  introModal.style.display = 'block';
  closeIntro.addEventListener('click', function () {
    introModal.style.display = 'none';
  });
});
