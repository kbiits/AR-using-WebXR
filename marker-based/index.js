var body = document.querySelector('body');
function openNav() {
    document.getElementById("mySidenav").style.width = body.clientWidth < 500 ? (body.clientWidth * 0.75).toString() + 'px' : '280px';
}
function closeNav() {
    document.getElementById("mySidenav").style.width = "0";
}
