// Loader
window.addEventListener("load", function () {

    const loader = document.getElementById("loader");

    loader.style.display = "none";

});

// AOS
AOS.init({

    duration:1000,

    once:true

});

// Navbar Scroll
window.addEventListener("scroll", function () {
    const nav = document.querySelector(".custom-navbar");
    if (nav) {
        if (window.scrollY > 40) {
            nav.classList.add("scrolled");
        } else {
            nav.classList.remove("scrolled");
        }
    }
});

// Progress Bar
window.onscroll=function(){

let winScroll=document.body.scrollTop||

document.documentElement.scrollTop;

let height=document.documentElement.scrollHeight-

document.documentElement.clientHeight;

let scrolled=(winScroll/height)*100;

document.getElementById("progressBar").style.width=scrolled+"%";

};

// Back To Top
const topBtn=document.getElementById("backTop");

window.addEventListener("scroll",()=>{

if(window.scrollY>400){

topBtn.style.display="block";

}else{

topBtn.style.display="none";

}

});

topBtn.onclick=function(){

window.scrollTo({

top:0,

behavior:"smooth"

});

};

/*=========================
Animated Counter
==========================*/

const counters=document.querySelectorAll(".counter");

const animateCounter=(counter)=>{

const target=+counter.dataset.target;

let count=0;

const increment=target/100;

const update=()=>{

count+=increment;

if(count<target){

counter.innerText=Math.ceil(count);

requestAnimationFrame(update);

}

else{

counter.innerText=target+"+";

}

};

update();

};

const observer=new IntersectionObserver(entries=>{

entries.forEach(entry=>{

if(entry.isIntersecting){

animateCounter(entry.target);

observer.unobserve(entry.target);

}

});

});

counters.forEach(counter=>{

observer.observe(counter);

});

/* =========================================================
   TESTIMONIAL SLIDER
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    const testimonialCards =
        document.querySelectorAll(".testimonial-card");

    const testimonialDots =
        document.querySelectorAll(".testimonial-dot");

    const prevButton =
        document.querySelector(".testimonial-prev");

    const nextButton =
        document.querySelector(".testimonial-next");

    if (
        !testimonialCards.length ||
        !testimonialDots.length ||
        !prevButton ||
        !nextButton
    ) {
        return;
    }


    let currentTestimonial = 0;


    function showTestimonial(index) {

        testimonialCards.forEach((card) => {
            card.classList.remove("active");
        });

        testimonialDots.forEach((dot) => {
            dot.classList.remove("active");
        });


        testimonialCards[index].classList.add("active");
        testimonialDots[index].classList.add("active");

        currentTestimonial = index;

    }


    function nextTestimonial() {

        let nextIndex =
            (currentTestimonial + 1) %
            testimonialCards.length;

        showTestimonial(nextIndex);

    }


    function previousTestimonial() {

        let previousIndex =
            (currentTestimonial - 1 +
                testimonialCards.length) %
            testimonialCards.length;

        showTestimonial(previousIndex);

    }


    nextButton.addEventListener(
        "click",
        nextTestimonial
    );


    prevButton.addEventListener(
        "click",
        previousTestimonial
    );


    testimonialDots.forEach((dot, index) => {

        dot.addEventListener("click", function () {

            showTestimonial(index);

        });

    });


    // Automatic sliding
    let testimonialInterval =
        setInterval(nextTestimonial, 6000);


    const slider =
        document.querySelector(".testimonial-slider");


    slider.addEventListener("mouseenter", function () {

        clearInterval(testimonialInterval);

    });


    slider.addEventListener("mouseleave", function () {

        testimonialInterval =
            setInterval(nextTestimonial, 6000);

    });

});

