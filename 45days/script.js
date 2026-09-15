// 커스텀 커서 요소를 선택함
const cursor = document.querySelector(".cursor");


// 실제 마우스 위치
let mouseX = 0;
let mouseY = 0;


// 화면에 표시되는 커서 위치
let cursorX = 0;
let cursorY = 0;


// 마우스가 움직일 때 실제 좌표를 저장함
document.addEventListener("mousemove", function (event) {
  mouseX = event.clientX;
  mouseY = event.clientY;
});


// 커서가 마우스를 부드럽게 따라가도록 반복 실행함
function animateCursor() {
  cursorX += (mouseX - cursorX) * 0.15;
  cursorY += (mouseY - cursorY) * 0.15;

  cursor.style.left = cursorX + "px";
  cursor.style.top = cursorY + "px";

  requestAnimationFrame(animateCursor);
}


// 커서 애니메이션 시작
animateCursor();


// 커서를 확대할 요소를 선택함
const hoverElements = document.querySelectorAll(
  "a, button, .project_card, .about_stat, .contact_sticker"
);


// 각각의 요소에 Hover 이벤트를 적용함
hoverElements.forEach(function (element) {

  // 요소 위에 마우스를 올리면 커서를 확대함
  element.addEventListener("mouseenter", function () {
    cursor.classList.add("cursor_active");
  });

  // 요소에서 마우스가 벗어나면 기본 크기로 돌아감
  element.addEventListener("mouseleave", function () {
    cursor.classList.remove("cursor_active");
  });

});