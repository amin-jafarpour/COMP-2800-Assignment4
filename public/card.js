function f() {
    $('#game_grid').html($('#content').html());
}









////////////////////
firstCard = undefined
secondCard = undefined

firstCardHasBeenFlipped = false




function setup() {
    $(".card").on("click", function() {
        $(this).toggleClass("flip")


        if (!firstCardHasBeenFlipped) {
            // the first card
            firstCard = $(this).find(".front_face")[0]
                // console.log(firstCard);
            firstCardHasBeenFlipped = true
        } else {
            // this is the 2nd card
            secondCard = $(this).find(".front_face")[0]
            firstCardHasBeenFlipped = false
            if (
                $(`#${firstCard.id}`).attr("src") ==
                $(`#${secondCard.id}`).attr("src")
            ) {
                $(`#${firstCard.id}`).parent().off("click")
                $(`#${secondCard.id}`).parent().off("click")
            } else {
                // unflipping
                setTimeout(() => {
                    $(`#${firstCard.id}`).parent().removeClass("flip")
                    $(`#${secondCard.id}`).parent().removeClass("flip")
                }, 1000)
            }
        }
    })
}

$(document).ready(setup)