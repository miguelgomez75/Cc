-- Each face shows the color of the axis which defines it

if abs(x) == 3 and abs(y) == 3 or
   abs(x) == 3 and abs(z) == 3 or
   abs(y) == 3 and abs(z) == 3 then
return 3
end
if abs(x) == 3 then
return 14
end
if abs(y) == 3 then
return 10
end
if abs(z) == 3 then
return 7
end
